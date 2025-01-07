/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Writable } from 'stream';

import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { CsvGenerator } from '@kbn/generate-csv';
import {
  CancellationToken,
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '@kbn/reporting-common';
import { CsvPagingStrategy, TaskInstanceFields } from '@kbn/reporting-common/types';
import {
  CSV_JOB_TYPE,
  CSV_REPORT_TYPE,
  JobParamsCSV,
  TaskPayloadCSV,
} from '@kbn/reporting-export-types-csv-common';
import {
  BaseExportTypeSetupDeps,
  BaseExportTypeStartDeps,
  ExportType,
  decryptJobHeaders,
  getFieldFormats,
} from '@kbn/reporting-server';

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

  public runTask = async (
    jobId: string,
    job: TaskPayloadCSV,
    taskInstanceFields: TaskInstanceFields,
    cancellationToken: CancellationToken,
    stream: Writable
  ) => {
    const logger = this.logger.get(`execute-job:${jobId}`);

    const { encryptionKey, csv: csvConfig } = this.config;
    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = this.getFakeRequest(headers, job.spaceId, logger);
    const uiSettings = await this.getUiSettingsClient(fakeRequest, logger);
    const dataPluginStart = this.startDeps.data;
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    const es = this.startDeps.esClient.asScoped(fakeRequest);
    const searchSourceStart = await dataPluginStart.search.searchSource.asScoped(fakeRequest);

    const clients = {
      uiSettings,
      data: dataPluginStart.search.asScoped(fakeRequest),
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
      stream
    );
    return await csv.generateData();
  };
}
