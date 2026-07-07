/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom } from 'rxjs';
import type { Writable } from 'stream';
import { errors as esErrors } from '@elastic/elasticsearch';
import type { IScopedClusterClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import { ESQL_SEARCH_STRATEGY, cellHasFormulas, getEsQueryConfig } from '@kbn/data-plugin/common';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import { type Filter, buildEsQuery, extractTimeRange } from '@kbn/es-query';
import { getTimeFieldFromESQLQuery, getStartEndParams, appendLimitToQuery } from '@kbn/esql-utils';
import type { ESQLSearchParams, ESQLSearchResponse } from '@kbn/es-types';
import { i18n } from '@kbn/i18n';
import type { CancellationToken, ReportingError } from '@kbn/reporting-common';
import { AuthenticationExpiredError, byteSizeValueToNumber } from '@kbn/reporting-common';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import type { ReportingConfigType } from '@kbn/reporting-server';
import { type TaskInstanceFields } from '@kbn/reporting-common/types';
import { zipObject } from 'lodash';

import { CONTENT_TYPE_CSV } from '../constants';
import { type CsvExportSettings, getExportSettings } from './lib/get_export_settings';
import { i18nTexts } from './lib/i18n_texts';
import { MaxSizeStringBuilder } from './lib/max_size_string_builder';
import { overrideTimeRange } from './lib/override_time_range';

export interface JobParamsCsvESQL {
  query: { esql: string };
  columns?: string[];
  filters?: Filter[];
  browserTimezone?: string;
  forceNow?: string;
  timeFieldName?: string;
}

interface Clients {
  es: IScopedClusterClient;
  data: IScopedSearchClient;
  uiSettings: IUiSettingsClient;
}

export class CsvESQLGenerator {
  private csvContainsFormulas = false;
  private maxSizeReached = false;
  private csvRowCount = 0;

  constructor(
    private job: JobParamsCsvESQL,
    private config: ReportingConfigType['csv'],
    private taskInstanceFields: TaskInstanceFields,
    private clients: Clients,
    private cancellationToken: CancellationToken,
    private logger: Logger,
    private stream: Writable,
    private jobId: string
  ) {}

  public async generateData(): Promise<TaskRunResult> {
    const settings = await getExportSettings(
      this.clients.uiSettings,
      this.taskInstanceFields,
      this.config,
      this.job.browserTimezone,
      this.logger
    );

    let reportingError: undefined | ReportingError;
    const warnings: string[] = [];

    const { maxSizeBytes, maxRows, bom, escapeFormulaValues, timezone } = settings;
    const builder = new MaxSizeStringBuilder(this.stream, byteSizeValueToNumber(maxSizeBytes), bom);

    // it will return undefined if there are no _tstart, _tend named params in the query
    const timeFieldName = getTimeFieldFromESQLQuery(this.job.query.esql);
    const params = [];
    if (timeFieldName && this.job.filters) {
      const { timeRange } = extractTimeRange(this.job.filters, timeFieldName);
      if (timeRange) {
        const namedParams = getStartEndParams(this.job.query.esql, timeRange);
        params.push(...namedParams);
      }
    }

    let currentFilters = this.job.filters;
    if (this.job.forceNow) {
      this.logger.debug(`Overriding time range filter using forceNow: ${this.job.forceNow}`, {
        tags: [this.jobId],
      });
      this.logger.debug(() => `Current filters: ${JSON.stringify(currentFilters)}`, {
        tags: [this.jobId],
      });
      const updatedFilters = overrideTimeRange({
        currentFilters,
        forceNow: this.job.forceNow,
        logger: this.logger,
        timeFieldName: this.job.timeFieldName,
      });
      this.logger.debug(() => `Updated filters: ${JSON.stringify(updatedFilters)}`, {
        tags: [this.jobId],
      });
      if (updatedFilters) {
        currentFilters = updatedFilters;
      }
    }

    const filter =
      currentFilters &&
      buildEsQuery(
        undefined,
        [],
        currentFilters,
        getEsQueryConfig(this.clients.uiSettings as Parameters<typeof getEsQueryConfig>[0])
      );

    let query = this.job.query.esql;
    if (query && maxRows) {
      query = appendLimitToQuery(this.job.query.esql, maxRows);
    }
    const searchParams: IKibanaSearchRequest<ESQLSearchParams> = {
      params: {
        query,
        filter,
        // locale can be used for number/date formatting
        locale: i18n.getLocale(),
        ...(params.length ? { params } : {}),
        time_zone: timezone,
      },
    };

    try {
      const abortController = new AbortController();
      this.cancellationToken.on(() => abortController.abort());
      const { rawResponse, warning } = await lastValueFrom(
        this.clients.data.search<
          IKibanaSearchRequest<ESQLSearchParams>,
          IKibanaSearchResponse<ESQLSearchResponse>
        >(searchParams, {
          strategy: ESQL_SEARCH_STRATEGY,
          abortSignal: abortController.signal,
          transport: {
            requestTimeout: settings.scroll.duration(this.taskInstanceFields),
          },
        })
      );

      if (warning) {
        warnings.push(warning);
      }

      const responseColumns = rawResponse.columns?.map(({ name }) => name) ?? [];
      const visibleColumns =
        this.job.columns && this.job.columns.length > 0
          ? this.job.columns.filter((column) => responseColumns.includes(column))
          : responseColumns;

      const rows = rawResponse.values.map((row) => zipObject(responseColumns, row));

      const header =
        Array.from(visibleColumns).map(this.escapeValues(settings)).join(settings.separator) + '\n';
      builder.tryAppend(header);

      await this.generateRows(visibleColumns, rows, builder, settings);
    } catch (err) {
      this.logger.error(err, { tags: [this.jobId] });
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

  /*
   * Format a Datatable into rows of CSV content
   */
  private async generateRows(
    columns: string[],
    rows: Array<Record<string, unknown>>,
    builder: MaxSizeStringBuilder,
    settings: CsvExportSettings
  ) {
    this.logger.debug(`Building ${rows.length} CSV data rows`, { tags: [this.jobId] });
    for (const dataTableRow of rows) {
      if (this.cancellationToken.isCancelled()) {
        break;
      }

      /*
       * Intrinsically, generating the rows is a synchronous process. Awaiting
       * on a setImmediate call here partititions what could be a very long and
       * CPU-intenstive synchronous process into an asychronous process. This
       * give NodeJS to process other asychronous events that wait on the Event
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
      const escape = this.escapeValues(settings);

      for (const column of columns) {
        let formattedValue: string = escape(`${dataTableRow[column]}`);
        if (formattedValue === 'null') formattedValue = '';
        if (formattedValue === 'undefined') formattedValue = '';
        rowDefinition.push(formattedValue);
      }

      if (!builder.tryAppend(rowDefinition.join(settings.separator) + '\n')) {
        this.logger.warn(`ES|QL CSV report: Max Size Reached after ${this.csvRowCount} rows.`, {
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

  private escapeValues(settings: CsvExportSettings) {
    return (value: string) => {
      if (settings.checkForFormulas && cellHasFormulas(value)) {
        this.csvContainsFormulas = true; // set warning if cell value has a formula
      }
      return settings.escapeValue(value);
    };
  }
}
