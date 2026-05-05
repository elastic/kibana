/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';

import type { KibanaRequest } from '@kbn/core/server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { CsvGenerator, CsvESQLGenerator } from '@kbn/generate-csv';
import {
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '@kbn/reporting-common';
import type {
  JobParamsCsvFromSavedObject,
  TaskPayloadCsvFromSavedObject,
} from '@kbn/reporting-export-types-csv-common';
import { CSV_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';
import type { RunTaskOpts } from '@kbn/reporting-server';
import {
  ExportType,
  getFieldFormats,
  type BaseExportTypeSetupDeps,
  type BaseExportTypeStartDeps,
} from '@kbn/reporting-server';

import type { ReportingRequestHandlerContext } from './types';

type CsvV2ExportTypeSetupDeps = BaseExportTypeSetupDeps;

export interface CsvV2ExportTypeStartDeps extends BaseExportTypeStartDeps {
  discover: DiscoverServerPluginStart;
  data: DataPluginStart;
}

export class CsvV2ExportType extends ExportType<
  JobParamsCsvFromSavedObject,
  TaskPayloadCsvFromSavedObject,
  CsvV2ExportTypeSetupDeps,
  CsvV2ExportTypeStartDeps
> {
  id = CSV_REPORT_TYPE_V2;
  name = CSV_REPORT_TYPE_V2;
  jobType = CSV_REPORT_TYPE_V2;
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
    this.logger = this.logger.get('csv-export-v2');
  }

  public createJob = async (
    jobParams: JobParamsCsvFromSavedObject,
    _context: ReportingRequestHandlerContext,
    req: KibanaRequest
  ) => {
    // 1. Validation of locatorParams
    const { locatorParams } = jobParams;
    const { id, params } = locatorParams[0];
    if (
      !locatorParams ||
      !Array.isArray(locatorParams) ||
      locatorParams.length !== 1 ||
      id !== 'DISCOVER_APP_LOCATOR' ||
      !params
    ) {
      throw Boom.badRequest('Invalid Job params: must contain a single Discover App locator');
    }

    // use Discover contract to get the title of the report from job params
    const { discover: discoverPluginStart } = this.startDeps;
    const locatorClient = await discoverPluginStart.locator.asScopedClient(req);
    const title = jobParams.title || (await locatorClient.titleFromLocator(params));

    const objectType = 'search' as const;
    const pagingStrategy = this.config.csv.scroll.strategy;

    return { ...jobParams, title, objectType, pagingStrategy };
  };

  public runTask = async ({
    jobId,
    payload: job,
    request,
    taskInstanceFields,
    cancellationToken,
    stream,
  }: RunTaskOpts<TaskPayloadCsvFromSavedObject>) => {
    const logger = this.logger.get(`execute:${jobId}`);

    const config = this.config;
    const { csv: csvConfig } = config;

    const uiSettings = await this.getUiSettingsClient(request, logger);
    const fieldFormatsRegistry = await getFieldFormats().fieldFormatServiceFactory(uiSettings);
    const { data: dataPluginStart, discover: discoverPluginStart } = this.startDeps;
    const data = dataPluginStart.search.asScoped(request);

    const { locatorParams } = job;
    const { params } = locatorParams[0];

    // use Discover contract to convert the job params into inputs for CsvGenerator
    const locatorClient = await discoverPluginStart.locator.asScopedClient(request);

    const query = await locatorClient.queryFromLocator(params);

    if (query && 'esql' in query) {
      // TODO: use columnsFromLocator
      // currently locatorClient.columnsFromLocator can only extract columns from the saved search,
      // but for the es|ql we simply want to get currently visible columns from params.columns.
      // we didn't want to add this change inside locatorClient.columnsFromLocator, as it would change the behaviour of csv_v2 for non-ES|QL export,
      // this should be addressed here https://github.com/elastic/kibana/issues/151190
      // const columns = await locatorClient.columnsFromLocator(params);
      const columns = params.columns as string[] | undefined;
      const timeFieldName = await locatorClient.timeFieldNameFromLocator(params);
      const filters = await locatorClient.filtersFromLocator(params);
      const es = this.startDeps.esClient.asScoped(request);

      const clients = { uiSettings, data, es };

      const csv = new CsvESQLGenerator(
        {
          columns,
          query,
          filters,
          timeFieldName,
          ...job,
        },
        csvConfig,
        taskInstanceFields,
        clients,
        cancellationToken,
        logger,
        stream,
        jobId
      );
      return await csv.generateData();
    }

    const columns = await locatorClient.columnsFromLocator(params);
    const searchSource = await locatorClient.searchSourceFromLocator(params);

    const es = this.startDeps.esClient.asScoped(request);
    const searchSourceStart = await dataPluginStart.search.searchSource.asScoped(request);

    const clients = { uiSettings, data, es };
    const dependencies = { searchSourceStart, fieldFormatsRegistry };

    const csv = new CsvGenerator(
      {
        columns,
        searchSource: searchSource.getSerializedFields(true),
        ...job,
      },
      csvConfig,
      taskInstanceFields,
      clients,
      dependencies,
      cancellationToken,
      logger,
      stream,
      this.isServerless,
      jobId
    );
    return await csv.generateData();
  };
}
