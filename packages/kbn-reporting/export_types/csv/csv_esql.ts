/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
import { Writable } from 'stream';

import type { KibanaRequest } from '@kbn/core/server';
import type { DataPluginStart } from '@kbn/data-plugin/server/plugin';
import type { DiscoverServerPluginStart } from '@kbn/discover-plugin/server';
import { CsvESQLGenerator } from '@kbn/generate-csv';
import {
  CancellationToken,
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_CLOUD_STANDARD,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_TRIAL,
} from '@kbn/reporting-common';
import {
  CSV_ESQL_REPORT_TYPE,
  JobParamsCsvESQL,
  TaskPayloadCsvESQL,
} from '@kbn/reporting-export-types-csv-common';
import {
  ExportType,
  decryptJobHeaders,
  type BaseExportTypeSetupDeps,
  type BaseExportTypeStartDeps,
} from '@kbn/reporting-server';

import { ReportingRequestHandlerContext } from './types';

type CsvESQLExportTypeSetupDeps = BaseExportTypeSetupDeps;

export interface CsvESQLExportTypeStartDeps extends BaseExportTypeStartDeps {
  discover: DiscoverServerPluginStart;
  data: DataPluginStart;
}

export class CsvESQLExportType extends ExportType<
  JobParamsCsvESQL,
  TaskPayloadCsvESQL,
  CsvESQLExportTypeSetupDeps,
  CsvESQLExportTypeStartDeps
> {
  id = CSV_ESQL_REPORT_TYPE;
  name = CSV_ESQL_REPORT_TYPE;
  jobType = CSV_ESQL_REPORT_TYPE;
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
    this.logger = this.logger.get('csv-export-esql');
  }

  public createJob = async (
    jobParams: JobParamsCsvESQL,
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
    const title = jobParams.title ?? (await locatorClient.titleFromLocator(params));

    return { ...jobParams, title, isDeprecated: false };
  };

  public runTask = async (
    jobId: string,
    job: TaskPayloadCsvESQL,
    cancellationToken: CancellationToken,
    stream: Writable
  ) => {
    const config = this.config;
    const { encryptionKey, csv: csvConfig } = config;
    const logger = this.logger.get(`execute:${jobId}`);

    const headers = await decryptJobHeaders(encryptionKey, job.headers, logger);
    const fakeRequest = this.getFakeRequest(headers, job.spaceId, logger);
    const uiSettings = await this.getUiSettingsClient(fakeRequest, logger);
    const { data: dataPluginStart, discover: discoverPluginStart } = this.startDeps;
    const data = dataPluginStart.search.asScoped(fakeRequest);

    const { locatorParams } = job;
    const { params } = locatorParams[0];

    // use Discover contract to convert the job params into inputs for CsvGenerator
    const locatorClient = await discoverPluginStart.locator.asScopedClient(fakeRequest);
    // TODO: use columnsFromLocator when it supports getting columns from params
    // we don't implement it now because it might be a breaking change for csv_v2 api that is currently only works with saved search
    // https://github.com/elastic/kibana/issues/151190
    // const columns = await locatorClient.columnsFromLocator(params);
    const columns = params.columns as string[] | undefined;
    const query = await locatorClient.queryFromLocator(params);

    if (!query || !('esql' in query)) {
      throw new Error(`Invalid query: must contain an ES|QL query`);
    }

    const filters = await locatorClient.filtersFromLocator(params);

    const es = this.startDeps.esClient.asScoped(fakeRequest);

    const clients = { uiSettings, data, es };

    const csv = new CsvESQLGenerator(
      {
        columns,
        query,
        filters,
        ...job,
      },
      csvConfig,
      clients,
      cancellationToken,
      logger,
      stream
    );
    return await csv.generateData();
  };
}
