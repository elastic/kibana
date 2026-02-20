/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { Writable } from 'stream';
import type { Filter } from '@kbn/es-query';
import type { estypes } from '@elastic/elasticsearch';
import { errors as esErrors } from '@elastic/elasticsearch';
import type { IScopedClusterClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import type { ISearchClient } from '@kbn/search-types';
import type { DataView, ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { cellHasFormulas, tabifyDocs } from '@kbn/data-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/server';
import type {
  FieldFormat,
  FieldFormatConfig,
  IFieldFormatsRegistry,
} from '@kbn/field-formats-plugin/common';
import type { CancellationToken, ReportingError } from '@kbn/reporting-common';
import {
  AuthenticationExpiredError,
  byteSizeValueToNumber,
  ReportingSavedObjectNotFoundError,
} from '@kbn/reporting-common';
import type { TaskInstanceFields, TaskRunResult } from '@kbn/reporting-common/types';
import type { ReportingConfigType } from '@kbn/reporting-server';

import { TaskErrorSource, createTaskRunError } from '@kbn/task-manager-plugin/server';
import { CONTENT_TYPE_CSV } from '../constants';
import type { JobParamsCSV } from '../types';
import { overrideTimeRange } from './lib/override_time_range';
import { getExportSettings, type CsvExportSettings } from './lib/get_export_settings';
import { i18nTexts } from './lib/i18n_texts';
import { MaxSizeStringBuilder } from './lib/max_size_string_builder';
import type { SearchCursor } from './lib/search_cursor';
import { SearchCursorPit } from './lib/search_cursor_pit';
import { SearchCursorScroll } from './lib/search_cursor_scroll';

interface Clients {
  es: IScopedClusterClient;
  data: ISearchClient;
  uiSettings: IUiSettingsClient;
}

interface Dependencies {
  searchSourceStart: ISearchStartSearchSource;
  fieldFormatsRegistry: IFieldFormatsRegistry;
}

export class CsvGenerator {
  private csvContainsFormulas = false;
  private maxSizeReached = false;
  private maxRowsReached = false;
  private csvRowCount = 0;

  constructor(
    private job: Omit<JobParamsCSV, 'version'>,
    private config: ReportingConfigType['csv'],
    private taskInstanceFields: TaskInstanceFields,
    private clients: Clients,
    private dependencies: Dependencies,
    private cancellationToken: CancellationToken,
    private logger: Logger,
    private stream: Writable,
    private isServerless: boolean = false,
    private jobId: string,
    private useInternalUser: boolean = false
  ) {}
  /*
   * Load field formats for each field in the list
   */
  private getFormatters(table: Datatable) {
    // initialize field formats
    const formatters: Record<string, FieldFormat> = {};
    table.columns.forEach((c) => {
      const fieldFormat = this.dependencies.fieldFormatsRegistry.deserialize(c.meta.params);
      formatters[c.id] = fieldFormat;
    });

    return formatters;
  }

  private escapeValues(settings: CsvExportSettings) {
    return (value: string) => {
      if (settings.checkForFormulas && cellHasFormulas(value)) {
        this.csvContainsFormulas = true; // set warning if cell value has a formula
      }
      return settings.escapeValue(value);
    };
  }

  private getColumnsFromTabify(table: Datatable) {
    const columnIds = table.columns.map((c) => c.id);
    columnIds.sort();
    return columnIds;
  }

  private formatCellValues(formatters: Record<string, FieldFormat>) {
    return ({
      column: tableColumn,
      data: dataTableCell,
    }: {
      column: string;
      data: unknown;
    }): string => {
      let cell: string[] | string | object;
      // check truthiness to guard against _score, _type, etc
      if (tableColumn && dataTableCell) {
        try {
          cell = formatters[tableColumn].convert(dataTableCell);
        } catch (err) {
          this.logger.error(err, { tags: [this.jobId] });
          cell = '-';
        }

        const isIdField = tableColumn === '_id'; // _id field can not be formatted or mutated
        if (!isIdField) {
          try {
            // unwrap the value
            // expected values are a string of JSON where the value(s) is in an array
            // examples: "[""Jan 1, 2020 @ 04:00:00.000""]","[""username""]"
            cell = JSON.parse(cell);
          } catch (e) {
            // ignore
          }
        }

        // We have to strip singular array values out of their array wrapper,
        // So that the value appears the visually the same as seen in Discover
        if (Array.isArray(cell)) {
          cell = cell.map((c) => (typeof c === 'object' ? JSON.stringify(c) : c)).join(', ');
        }

        // Check for object-type value (geoip)
        if (typeof cell === 'object') {
          cell = JSON.stringify(cell);
        }

        return cell;
      }

      return '-'; // Unknown field: it existed in searchSource but has no value in the result
    };
  }

  /*
   * Use the list of columns to generate the header row
   */
  private generateHeader(
    columns: Set<string>,
    builder: MaxSizeStringBuilder,
    settings: CsvExportSettings,
    dataView: DataView
  ) {
    this.logger.debug(`Building CSV header row`, { tags: [this.jobId] });
    const header =
      Array.from(columns)
        .map((column) => {
          const field = dataView?.fields.getByName(column);
          if (field && field.customLabel && field.customLabel !== column) {
            return `${field.customLabel} (${column})`;
          }
          return column;
        })
        .map(this.escapeValues(settings))
        .join(settings.separator) + '\n';

    if (!builder.tryAppend(header)) {
      return {
        content: '',
        maxSizeReached: true,
        warnings: [],
      };
    }
  }

  /*
   * Format a Datatable into rows of CSV content
   */
  private async generateRows(
    columns: Set<string>,
    table: Datatable,
    builder: MaxSizeStringBuilder,
    formatters: Record<string, FieldFormat>,
    settings: CsvExportSettings
  ) {
    this.logger.debug(`Building ${table.rows.length} CSV data rows`, { tags: [this.jobId] });
    for (const dataTableRow of table.rows) {
      if (this.cancellationToken.isCancelled()) {
        break;
      }

      /*
       * Intrinsically, generating the rows is a synchronous process. Awaiting
       * on a setImmediate call here partitions what could be a very long and
       * CPU-intensive synchronous process into asynchronous processes. This
       * give NodeJS to process other asynchronous events that wait on the Event
       * Loop.
       *
       * See: https://nodejs.org/en/docs/guides/dont-block-the-event-loop/
       *
       * It's likely this creates a lot of context switching, and adds to the
       * time it would take to generate the CSV. There are alternatives to the
       * chosen performance solution:
       *
       * 1. Partition the synchronous process with fewer partitions, by using
       * the loop counter to call setImmediate only every N amount of rows.
       * Testing is required to see what the best N value for most data will
       * be.
       *
       * 2. Use a C++ add-on to generate the CSV using the Node Worker Pool
       * instead of using the Event Loop
       */
      await new Promise(setImmediate);

      const rowDefinition: string[] = [];
      const format = this.formatCellValues(formatters);
      const escape = this.escapeValues(settings);

      for (const column of columns) {
        rowDefinition.push(escape(format({ column, data: dataTableRow[column] })));
      }

      if (!builder.tryAppend(rowDefinition.join(settings.separator) + '\n')) {
        this.logger.warn(`Max Size Reached after ${this.csvRowCount} rows.`, {
          tags: [this.jobId],
        });
        this.maxSizeReached = true;
        if (this.cancellationToken) {
          this.cancellationToken.cancel();
        }
        break;
      }

      this.csvRowCount++;
    }
  }

  public async generateData(): Promise<TaskRunResult> {
    const logger = this.logger;

    const createSearchSource = async () => {
      try {
        const source = await this.dependencies.searchSourceStart.create(this.job.searchSource);
        return source;
      } catch (err) {
        // Saved object not found
        if (err?.output?.statusCode === 404) {
          const reportingError = new ReportingSavedObjectNotFoundError(err);
          throw createTaskRunError(reportingError, TaskErrorSource.USER);
        }
        throw err;
      }
    };

    const [settings, searchSource] = await Promise.all([
      getExportSettings(
        this.clients.uiSettings,
        this.taskInstanceFields,
        this.config,
        this.job.browserTimezone,
        logger
      ),
      createSearchSource(),
    ]);
    searchSource.setField('timezone', settings.timezone);

    const { startedAt, retryAt } = this.taskInstanceFields;
    if (startedAt) {
      this.logger.debug(
        `Task started at: ${startedAt && moment(startedAt).format()}.` +
          ` Can run until: ${retryAt && moment(retryAt).format()}`,
        { tags: [this.jobId] }
      );
    }

    const index = searchSource.getField('index');

    if (!index) {
      throw new Error(`The search must have a reference to an index pattern!`);
    }

    if (this.job.forceNow) {
      this.logger.debug(`Overriding time range filter using forceNow: ${this.job.forceNow}`, {
        tags: [this.jobId],
      });

      const currentFilters = searchSource.getField('filter') as Filter[] | Filter | undefined;
      this.logger.debug(() => `Current filters: ${JSON.stringify(currentFilters)}`, {
        tags: [this.jobId],
      });
      const updatedFilters = overrideTimeRange({
        currentFilters,
        forceNow: this.job.forceNow,
        logger: this.logger,
      });
      this.logger.debug(() => `Updated filters: ${JSON.stringify(updatedFilters)}`, {
        tags: [this.jobId],
      });

      if (updatedFilters) {
        searchSource.removeField('filter'); // remove existing filters
        searchSource.setField('filter', updatedFilters);
      }
    }

    const { maxSizeBytes, maxRows, bom, escapeFormulaValues, timezone } = settings;
    const indexPatternTitle = index.getIndexPattern();
    const builder = new MaxSizeStringBuilder(this.stream, byteSizeValueToNumber(maxSizeBytes), bom);
    const warnings: string[] = [];
    let first = true;
    let currentRecord = -1;
    let totalRecords: number | undefined;
    let reportingError: undefined | ReportingError;

    const abortController = new AbortController();
    this.cancellationToken.on(() => abortController.abort());

    // use a class to internalize the paging strategy
    let cursor: SearchCursor;
    if (this.job.pagingStrategy === 'scroll') {
      // Optional strategy: scan-and-scroll
      cursor = new SearchCursorScroll(
        indexPatternTitle,
        settings,
        this.clients,
        abortController,
        this.logger,
        this.useInternalUser
      );
      logger.debug('Using search strategy: scroll', { tags: [this.jobId] });
    } else {
      // Default strategy: point-in-time
      cursor = new SearchCursorPit(
        indexPatternTitle,
        settings,
        this.clients,
        abortController,
        this.logger,
        this.useInternalUser
      );
      logger.debug('Using search strategy: pit', { tags: [this.jobId] });
    }
    await cursor.initialize();

    // apply timezone from the job to all date field formatters
    try {
      index.fields.getByType('date').forEach(({ name }) => {
        logger.debug(`Setting timezone on ${name}`, { tags: [this.jobId] });
        const format: FieldFormatConfig = {
          ...index.fieldFormatMap[name],
          id: index.fieldFormatMap[name]?.id || 'date', // allow id: date_nanos
          params: {
            ...index.fieldFormatMap[name]?.params,
            timezone,
          },
        };
        index.setFieldFormat(name, format);
      });
    } catch (err) {
      logger.error(err, { tags: [this.jobId] });
    }

    const columns = new Set<string>(this.job.columns ?? []);
    try {
      do {
        if (this.cancellationToken.isCancelled()) {
          break;
        }

        // override the scroll size if the maxRows limit is smaller
        const size = Math.min(settings.scroll.size, maxRows);
        searchSource.setField('size', size);

        let results: estypes.SearchResponse<unknown> | undefined;
        try {
          results = await cursor.getPage(searchSource);
        } catch (err) {
          err.message = `CSV export search error: ${err.message}`;
          throw err;
        }

        if (!results) {
          logger.warn(`Search results are undefined!`, { tags: [this.jobId] });
          break;
        }

        const { total } = results.hits;
        const trackedTotal = total as estypes.SearchTotalHits;
        const currentTotal = trackedTotal?.value ?? total;

        if (first) {
          // export stops when totalRecords have been accumulated (or the results have run out)
          totalRecords = currentTotal;
        }

        // use the most recently received cursor id for the next search request
        cursor.updateIdFromResults(results);

        // check for shard failures, log them and add a warning if found
        const { _shards: shards } = results;
        if (shards.failures) {
          shards.failures.forEach(({ reason }) => {
            warnings.push(`Shard failure: ${JSON.stringify(reason)}`);
            logger.warn(JSON.stringify(reason), { tags: [this.jobId] });
          });
        }

        let table: Datatable | undefined;
        try {
          table = tabifyDocs(results, index, { shallow: true, includeIgnoredValues: true });
        } catch (err) {
          logger.error(err, { tags: [this.jobId] });
          warnings.push(i18nTexts.unknownError(err?.message ?? err));
        }

        if (!table) {
          break;
        }

        if (!this.job.columns?.length) {
          this.getColumnsFromTabify(table).forEach((column) => columns.add(column));
        }

        if (first) {
          first = false;
          this.generateHeader(columns, builder, settings, index);
        }

        if (table.rows.length < 1) {
          break; // empty report with just the header
        }

        // FIXME: make tabifyDocs handle the formatting, to get the same formatting logic as Discover?
        const formatters = this.getFormatters(table);
        await this.generateRows(columns, table, builder, formatters, settings);

        // update iterator
        currentRecord += table.rows.length;

        // stop generating the report if the
        // current number of rows is >= the max row limit
        if (currentRecord >= maxRows - 1) {
          this.logger.warn(
            `Your requested export includes ${totalRecords} rows, which has exceeded the recommended row limit (${maxRows}).${
              this.isServerless
                ? ''
                : ' This limit can be configured in kibana.yml, but increasing it may impact performance.'
            }`
          );
          this.maxRowsReached = true;
          break;
        }
      } while (totalRecords != null && currentRecord < totalRecords - 1);

      // Add warnings to be logged
      if (this.csvContainsFormulas && escapeFormulaValues) {
        warnings.push(i18nTexts.escapedFormulaValuesMessage);
      }
    } catch (err) {
      logger.error(err, { tags: [this.jobId] });
      if (err instanceof esErrors.ResponseError) {
        if ([401, 403].includes(err.statusCode ?? 0)) {
          reportingError = new AuthenticationExpiredError();
          warnings.push(i18nTexts.authenticationError.partialResultsMessage);
        } else {
          warnings.push(i18nTexts.esErrorMessage(err.statusCode ?? 0, String(err.body)));
        }
      } else {
        warnings.push(i18nTexts.unknownError(err?.message ?? err));
      }
    } finally {
      try {
        await cursor.closeCursor();
      } catch (err) {
        logger.error(err, { tags: [this.jobId] });
        warnings.push(cursor.getUnableToCloseCursorMessage());
      }
    }

    logger.info(`Finished generating. Row count: ${this.csvRowCount}.`, { tags: [this.jobId] });

    if (this.maxRowsReached) {
      warnings.push(
        i18nTexts.csvMaxRowsWarning({
          isServerless: this.isServerless,
          maxRows,
          expected: totalRecords ?? 0,
        })
      );
    } else if (!this.maxSizeReached && !this.maxRowsReached && this.csvRowCount !== totalRecords) {
      logger.warn(
        `ES scroll returned ` +
          `${this.csvRowCount > (totalRecords ?? 0) ? 'more' : 'fewer'} total hits than expected!`,
        { tags: [this.jobId] }
      );
      logger.warn(`Search result total hits: ${totalRecords}. Row count: ${this.csvRowCount}`);

      if (totalRecords || totalRecords === 0) {
        warnings.push(
          i18nTexts.csvRowCountError({ expected: totalRecords, received: this.csvRowCount })
        );
      } else {
        warnings.push(i18nTexts.csvRowCountIndeterminable({ received: this.csvRowCount }));
      }
    }

    if (this.csvRowCount === 0) {
      if (warnings.length > 0) {
        /*
         * Add the errors into the CSV content. This makes error messages more
         * discoverable. When the export was automated or triggered by an API
         * call or is automated, the user doesn't necessarily go through the
         * Kibana UI to download the export and might not otherwise see the
         * error message.
         */
        logger.info('CSV export content was empty. Adding error messages to CSV export content.', {
          tags: [this.jobId],
        });
        // join the string array and putting double quotes around each item
        // add a leading newline so the first message is not treated as a header
        builder.tryAppend('\n"' + warnings.join('"\n"') + '"');
      } else {
        logger.info('CSV export content was empty. No error messages.', { tags: [this.jobId] });
      }
    }

    return {
      content_type: CONTENT_TYPE_CSV,
      csv_contains_formulas: this.csvContainsFormulas && !escapeFormulaValues,
      max_size_reached: this.maxSizeReached,
      metrics: {
        csv: { rows: this.csvRowCount },
      },
      warnings,
      error_code: reportingError?.code,
    };
  }
}
