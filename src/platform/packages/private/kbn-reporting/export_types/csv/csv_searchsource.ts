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
    useInternalUser = false,
  }: RunTaskOpts<TaskPayloadCSV>) => {
    const logger = this.logger.get('execute-job');

    const { csv: csvConfig } = this.config;

    const uiSettings = await this.getUiSettingsClient(request, logger);
    const dataPluginStart = this.startDeps.data;
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    const es = this.startDeps.esClient.asScoped(request);
    const searchSourceStart = await dataPluginStart.search.searchSource.asScoped(request);

    const clients = {
      uiSettings,
      data: dataPluginStart.search.asScoped(request),
      es,
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
      stream,
      this.isServerless,
      jobId,
      useInternalUser
    );
    return await csv.generateData();
  };
}
