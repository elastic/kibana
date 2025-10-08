/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { CsvGenerator } from '@kbn/generate-csv';
import {
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '@kbn/reporting-common';
import type { CsvPagingStrategy } from '@kbn/reporting-common/types';
import type { JobParamsCSV, TaskPayloadCSV } from '@kbn/reporting-export-types-csv-common';
import { CSV_JOB_TYPE, CSV_REPORT_TYPE } from '@kbn/reporting-export-types-csv-common';
import type {
  BaseExportTypeSetupDeps,
  BaseExportTypeStartDeps,
  RunTaskOpts,
} from '@kbn/reporting-server';
import { ExportType, getFieldFormats } from '@kbn/reporting-server';

type CsvSearchSourceExportTypeSetupDeps = BaseExportTypeSetupDeps;
interface CsvSearchSourceExportTypeStartDeps extends BaseExportTypeStartDeps {
  data: DataPluginStart;
  discover: DiscoverServerPluginStart;
}

export class CsvSearchSourceExportType extends ExportType<
  JobParamsCSV,
  TaskPayloadCSV,
  CsvSearchSourceExportTypeSetupDeps,
  CsvSearchSourceExportTypeStartDeps
> {
  id = CSV_REPORT_TYPE;
  name = CSV_JOB_TYPE;
  jobType = CSV_JOB_TYPE;
  jobContentEncoding = 'base64' as const;
  jobContentExtension = 'csv' as const;
  validLicenses = [
    LICENSE_TYPE_TRIAL,
    LICENSE_TYPE_BASIC,
    LICENSE_TYPE_CLOUD_STANDARD,
    LICENSE_TYPE_GOLD,
    LICENSE_TYPE_PLATINUM,
    LICENSE_TYPE_ENTERPRISE,
  ];

  constructor(...args: ConstructorParameters<typeof ExportType>) {
    super(...args);
    this.logger = this.logger.get('csv-searchsource-export');
  }

  public createJob = async (jobParams: JobParamsCSV) => {
    const pagingStrategy = this.config.csv.scroll.strategy as CsvPagingStrategy;
    return { pagingStrategy, ...jobParams };
  };

  public runTask = async ({
    jobId,
    payload: job,
    taskInstanceFields,
    request,
    cancellationToken,
    stream,
  }: RunTaskOpts<TaskPayloadCSV>) => {
    const logger = this.logger.get(`execute-job:${jobId}`);

    const { csv: csvConfig } = this.config;

    const uiSettings = await this.getUiSettingsClient(request, logger);
    const dataPluginStart = this.startDeps.data;
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    // Check if this is a Fleet agent export - use system privileges for Fleet data
    const isFleetAgentExport =
      job.title === 'Agent List' &&
      (typeof job.searchSource.index === 'string'
        ? false
        : job.searchSource.index?.title === '.fleet-agents');

    logger.info(
      `CSV Export Debug: title="${job.title}", index="${
        typeof job.searchSource.index === 'string'
          ? job.searchSource.index
          : job.searchSource.index?.title
      }", isFleetAgentExport=${isFleetAgentExport}`
    );

    if (isFleetAgentExport) {
      logger.info('Using internal user privileges for Fleet agent export');

      // For Fleet agent exports, use internal user privileges completely
      // This avoids user credential issues by bypassing user context entirely

      // Create search source with user context for UI settings only
      const searchSourceStart = await dataPluginStart.search.searchSource.asScoped(request);

      // Use internal ES client for all operations
      const internalEsClient = this.startDeps.esClient.asInternalUser;

      // Create an ES client interface that uses internal user for both methods
      const internalEsClientScoped = {
        ...this.startDeps.esClient.asScoped(request),
        asCurrentUser: internalEsClient,
        asInternalUser: internalEsClient,
      };

      // For Fleet exports, we'll bypass the normal search client entirely
      // and use a custom implementation that calls searchAsInternalUser directly
      const clients = {
        uiSettings,
        data: {
          // This is a minimal implementation that bypasses user credentials
          search: (searchRequest: any, searchOptions: any = {}) => {
            logger.debug('Fleet agent export: Using searchAsInternalUser strategy directly');

            // Check if this is a PIT search and disable ccs_minimize_roundtrips to avoid conflict
            const isPitSearch = searchRequest.params?.pit?.id;
            if (isPitSearch) {
              logger.debug(
                'Fleet agent export: Detected PIT search, removing conflicting parameters'
              );
              // Remove parameters that conflict with PIT searches
              const { indices_options, indicesOptions, ignore_unavailable, index, ...cleanParams } =
                searchRequest.params;

              searchRequest = {
                ...searchRequest,
                params: {
                  ...cleanParams,
                  // Explicitly override the default parameters that conflict with PIT
                  ccs_minimize_roundtrips: false,
                  ignore_unavailable: undefined, // Remove this parameter for PIT
                },
              };
            }

            // Create internal dependencies without user context
            const internalDeps = {
              esClient: internalEsClientScoped, // Use the full scoped client interface
              savedObjectsClient: this.startDeps.savedObjects.createInternalRepository(),
              uiSettingsClient: uiSettings,
              searchSessionsClient: {
                save: async () => undefined,
                get: async () => ({ attributes: {} } as any),
                find: async () => ({ saved_objects: [] } as any),
                update: async () => ({ attributes: {} } as any),
                cancel: async () => ({}),
                delete: async () => ({}),
                extend: async () => ({ attributes: {} } as any),
                status: async () => ({ status: 'complete' } as any),
                getId: async () => '',
                trackId: async () => {},
                getSearchIdMapping: async () => new Map(),
                getConfig: () => ({ enabled: false } as any),
              },
              request,
            };

            return dataPluginStart.search.searchAsInternalUser.search(
              searchRequest,
              searchOptions,
              internalDeps
            ) as any;
          },
          // Add missing methods required by ISearchClient interface
          cancel: async () => {},
          extend: async () => {},
          // Minimal session methods to satisfy interface
          saveSession: async () => ({ id: '' }),
          getSession: async () => ({ attributes: {} } as any),
          findSessions: async () => ({ saved_objects: [] } as any),
          updateSession: async () => ({ attributes: {} } as any),
          cancelSession: async () => ({}),
          deleteSession: async () => ({}),
          extendSession: async () => ({ attributes: {} } as any),
          getSessionStatus: async () => ({ status: 'complete' } as any),
        },
        es: internalEsClientScoped,
      };
      const dependencies = {
        searchSourceStart,
        fieldFormatsRegistry,
      };

      logger.info('Using internal search client for Fleet agent CSV generation');

      const csv = new CsvGenerator(
        job,
        csvConfig,
        taskInstanceFields,
        clients,
        dependencies,
        cancellationToken,
        logger,
        stream
      );
      return await csv.generateData();
    } else {
      logger.info('Using user privileges for regular export');
    }

    const searchSourceStart = await dataPluginStart.search.searchSource.asScoped(request);

    const clients = {
      uiSettings,
      data: dataPluginStart.search.asScoped(request),
      es: this.startDeps.esClient.asScoped(request),
    };
    const dependencies = {
      searchSourceStart,
      fieldFormatsRegistry,
    };

    const csv = new CsvGenerator(
      job,
      csvConfig,
      taskInstanceFields,
      clients,
      dependencies,
      cancellationToken,
      logger,
      stream
    );
    return await csv.generateData();
  };
}
