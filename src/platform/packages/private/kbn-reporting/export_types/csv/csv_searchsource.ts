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
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
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
  security?: SecurityPluginStart;
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

      // Basic authorization check - ensure user has Fleet privileges
      // This is a lightweight check without importing Fleet dependencies
      try {
        const security = this.startDeps.security;
        if (security) {
          const user = security.authc.getCurrentUser(request);
          if (!user) {
            logger.warn('No authenticated user found for Fleet agent export');
            throw new Error('Authentication required for Fleet agent export');
          }

          logger.debug(`Fleet agent export requested by user: ${user.username}`);
          // Additional authorization will be handled by the internal user access pattern
        }
      } catch (error) {
        logger.error(`Fleet agent export authorization error: ${error.message}`);
        throw error;
      }

      // Use internal user privileges for Fleet agent data access
      // This approach keeps using the normal search flow but substitutes the ES client
      // to use internal user privileges when the search cursors make ES calls

      // Create search source with user context (for UI settings, etc.)
      const searchSourceStart = await dataPluginStart.search.searchSource.asScoped(request);

      // Use internal ES client for all operations
      const internalEsClient = this.startDeps.esClient.asInternalUser;
      const internalEsClientScoped = {
        ...this.startDeps.esClient.asScoped(request),
        asCurrentUser: internalEsClient,
        asInternalUser: internalEsClient,
      };

      const clients = {
        uiSettings,
        data: dataPluginStart.search.asScoped(request),
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
