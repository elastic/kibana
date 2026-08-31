/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/generate-csv', () => {
  class CsvGeneratorMock {
    generateData() {
      return { content_type: 'text/csv' };
    }
  }

  return {
    CsvGenerator: CsvGeneratorMock,
    CsvESQLGenerator: CsvGeneratorMock,
  };
});

import type { Writable } from 'stream';
import { coreMock, elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { FakeRawRequest, KibanaRequest } from '@kbn/core/server';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { discoverPluginMock } from '@kbn/discover-plugin/server/mocks';
import { createFieldFormatsStartMock } from '@kbn/field-formats-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { CancellationToken } from '@kbn/reporting-common';
import type { TaskPayloadCsvFromSavedObject } from '@kbn/reporting-export-types-csv-common';
import { createMockConfigSchema } from '@kbn/reporting-mocks-server';
import { setFieldFormats } from '@kbn/reporting-server';

import { CsvV2ExportType } from './csv_v2';

const rawRequest: FakeRawRequest = {
  headers: { authorization: 'ApiKey test-api-key' },
};
const request = rawRequest as unknown as KibanaRequest;
const taskInstanceFields = { startedAt: null, retryAt: null };
const stream = {} as jest.Mocked<Writable>;
const spaceProjectRouting = { projectRouting: 'space' };

const createPayload = (): TaskPayloadCsvFromSavedObject => ({
  browserTimezone: 'UTC',
  headers: 'encrypted-headers',
  locatorParams: [
    {
      id: 'DISCOVER_APP_LOCATOR',
      version: '1.0.0',
      params: {},
    },
  ],
  objectType: 'search',
  pagingStrategy: 'pit',
  title: 'Test report',
  version: '1.0.0',
});

const setupExportType = () => {
  const config = createMockConfigSchema();
  const coreStart = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  const discover = discoverPluginMock.createStartContract();
  const esClient = elasticsearchServiceMock.createClusterClient();
  const searchSourceAsScoped = jest.spyOn(data.search.searchSource, 'asScoped');
  const exportType = new CsvV2ExportType(
    coreMock.createSetup(),
    config,
    loggingSystemMock.createLogger(),
    coreMock.createPluginInitializerContext(config)
  );

  exportType.setup({});
  exportType.start({
    data,
    discover,
    esClient,
    licensing: licensingMock.createStart(),
    savedObjects: coreStart.savedObjects,
    uiSettings: coreStart.uiSettings,
  });

  return { data, discover, esClient, exportType, searchSourceAsScoped };
};

beforeAll(() => {
  setFieldFormats(createFieldFormatsStartMock());
});

test('uses space-scoped clients for ES|QL reports', async () => {
  const { data, discover, esClient, exportType } = setupExportType();
  const locatorClient = await discover.locator.asScopedClient(request);
  jest.mocked(locatorClient.queryFromLocator).mockResolvedValue({ esql: 'FROM logs-*' });

  await exportType.runTask({
    jobId: 'esql-report',
    request,
    payload: createPayload(),
    taskInstanceFields,
    cancellationToken: new CancellationToken(),
    stream,
  });

  expect(data.search.asScoped).toHaveBeenCalledWith(request, spaceProjectRouting);
  expect(esClient.asScoped).toHaveBeenCalledWith(request, spaceProjectRouting);
});

test('uses space-scoped clients for SearchSource reports', async () => {
  const { data, esClient, exportType, searchSourceAsScoped } = setupExportType();

  await exportType.runTask({
    jobId: 'search-source-report',
    request,
    payload: createPayload(),
    taskInstanceFields,
    cancellationToken: new CancellationToken(),
    stream,
  });

  expect(data.search.asScoped).toHaveBeenCalledWith(request, spaceProjectRouting);
  expect(searchSourceAsScoped).toHaveBeenCalledWith(request, spaceProjectRouting);
  expect(esClient.asScoped).toHaveBeenCalledWith(request, spaceProjectRouting);
});
