/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Writable } from 'stream';

import { KibanaRequest } from '@kbn/core-http-server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { CsvGenerator } from '@kbn/generate-csv';
import {
  CancellationToken,
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
  durationToNumber,
} from '@kbn/reporting-common';
import type { TaskRunResult } from '@kbn/reporting-common/types';
import {
  CSV_SEARCHSOURCE_IMMEDIATE_TYPE,
  JobParamsDownloadCSV,
} from '@kbn/reporting-export-types-csv-common';
import type { BaseExportTypeSetupDeps, BaseExportTypeStartDeps } from '@kbn/reporting-server';
import { ExportType, getFieldFormats } from '@kbn/reporting-server';

import { ReportingRequestHandlerContext } from './types';

type CsvSearchSourceImmediateExportTypeSetupDeps = BaseExportTypeSetupDeps;
interface CsvSearchSourceImmediateExportTypeStartDeps extends BaseExportTypeStartDeps {
  discover: DiscoverServerPluginStart;
  data: DataPluginStart;
}

/*
 * ImmediateExecuteFn receives the job doc payload because the payload was
 * generated in the ScheduleFn
 */
export type ImmediateExecuteFn = (
  jobId: null,
  job: JobParamsDownloadCSV,
  context: ReportingRequestHandlerContext,
  stream: Writable,
  req: KibanaRequest
) => Promise<TaskRunResult>;

/**
 * @deprecated
 * Requires `xpack.reporting.csv.enablePanelActionDownload` set to `true` (default is false)
 */
export class CsvSearchSourceImmediateExportType extends ExportType<
  JobParamsDownloadCSV,
  ImmediateExecuteFn,
  CsvSearchSourceImmediateExportTypeSetupDeps,
  CsvSearchSourceImmediateExportTypeStartDeps
> {
  id = CSV_SEARCHSOURCE_IMMEDIATE_TYPE;
  name = CSV_SEARCHSOURCE_IMMEDIATE_TYPE;
  jobType = CSV_SEARCHSOURCE_IMMEDIATE_TYPE;
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

  public createJob = async () => {
    throw new Error(`immediate download has no create job handler!`);
  };
  // @ts-ignore expected type failure from deprecated export type
  public runTask = async (
    _jobId: string | null,
    immediateJobParams: JobParamsDownloadCSV,
    context: ReportingRequestHandlerContext,
    stream: Writable,
    req: KibanaRequest
  ) => {
    const job = {
      objectType: 'immediate-search',
      ...immediateJobParams,
    };

    const dataPluginStart = this.startDeps.data;
    const savedObjectsClient = (await context.core).savedObjects.client;
    const uiSettings = this.getUiSettingsServiceFactory(savedObjectsClient);
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);

    const es = this.startDeps.esClient.asScoped(req);
    const searchSourceStart = await dataPluginStart.search.searchSource.asScoped(req);
    const clients = {
      uiSettings,
      data: dataPluginStart.search.asScoped(req),
      es,
    };
    const dependencies = {
      fieldFormatsRegistry,
      searchSourceStart,
    };
    const cancellationToken = new CancellationToken();
    const csvConfig = this.config.csv;
    const taskInstanceFields =
      csvConfig.scroll.duration === 'auto'
        ? {
            startedAt: new Date(),
            retryAt: new Date(Date.now() + durationToNumber(this.config.queue.timeout)),
          }
        : {
            startedAt: null,
            retryAt: null,
          };

    const csv = new CsvGenerator(
      job,
      csvConfig,
      taskInstanceFields,
      clients,
      dependencies,
      cancellationToken,
      this.logger,
      stream
    );
    const result = await csv.generateData();

    if (result.csv_contains_formulas) {
      this.logger.warn(`CSV may contain formulas whose values have been escaped`);
    }

    if (result.max_size_reached) {
      this.logger.warn(`Max size reached: CSV output truncated`);
    }

    const { warnings } = result;
    if (warnings) {
      warnings.forEach((warning) => {
        this.logger.warn(warning);
      });
    }

    return result;
  };
}
