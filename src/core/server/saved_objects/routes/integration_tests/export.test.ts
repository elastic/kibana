/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('../../export', () => ({
  exportSavedObjectsToStream: jest.fn(),
}));

import supertest from 'supertest';
import type { UnwrapPromise } from '@kbn/utility-types';
import { createListStream } from '@kbn/utils';
import { CoreUsageStatsClient } from '../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../core_usage_data/core_usage_data_service.mock';
import { savedObjectsExporterMock } from '../../export/saved_objects_exporter.mock';
import { loggingSystemMock } from '../../../logging/logging_system.mock';
import { SavedObjectConfig } from '../../saved_objects_config';
import { registerExportRoute } from '../export';
import { setupServer, createExportableType } from '../test_utils';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;
const allowedTypes = ['index-pattern', 'search'];
const config = {
  maxImportPayloadBytes: 26214400,
  maxImportExportSize: 10000,
} as SavedObjectConfig;
let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;

describe('POST /api/saved_objects/_export', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let exporter: ReturnType<typeof savedObjectsExporterMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    handlerContext.savedObjects.typeRegistry.getImportableAndExportableTypes.mockReturnValue(
      allowedTypes.map(createExportableType)
    );
    exporter = handlerContext.savedObjects.getExporter();
    logger = loggingSystemMock.createLogger();

    const router = httpSetup.createRouter('/api/saved_objects/');
    handlerContext.savedObjects.getExporter = jest
      .fn()
      .mockImplementation(() => exporter as ReturnType<typeof savedObjectsExporterMock.create>);

    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsExport.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerExportRoute(router, { config, coreUsageData, logger });

    await server.start();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const sortedObjects = [
      {
        id: '1',
        type: 'index-pattern',
        attributes: {},
        references: [],
      },
      {
        id: '2',
        type: 'search',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ];

    exporter.exportByTypes.mockResolvedValueOnce(createListStream(sortedObjects));

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_export')
      .send({
        type: 'search',
        search: 'my search string',
        include_references_deep: true,
      });

    expect(result.status).toBe(200);
    expect(result.header).toEqual(
      expect.objectContaining({
        'content-disposition': 'attachment; filename="export.ndjson"',
        'content-type': 'application/ndjson',
      })
    );

    const objects = (result.text as string).split('\n').map((row) => JSON.parse(row));
    expect(objects).toEqual(sortedObjects);
    expect(exporter.exportByTypes.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        excludeExportDetails: false,
        includeReferencesDeep: true,
        search: 'my search string',
        types: ['search'],
      })
    );
    expect(coreUsageStatsClient.incrementSavedObjectsExport).toHaveBeenCalledWith({
      request: expect.anything(),
      types: ['search'],
      supportedTypes: ['index-pattern', 'search'],
      usedDeprecatedBodyFields: false,
    });
  });

  it('throws an error if deprecated and non-deprecated fields are mixed', async () => {
    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_export')
      .send({
        type: 'search',
        search: 'my search string',
        includeReferencesDeep: true,
        include_references_deep: true,
      });

    expect(result.status).toBe(400);
    expect(result.body.message).toMatchInlineSnapshot(
      `"[request body]: cannot use both [include_references_deep] and the deprecated [includeReferencesDeep]"`
    );
  });

  it('logs a warning when a deprecated field is useed', async () => {
    const sortedObjects = [
      {
        id: '1',
        type: 'index-pattern',
        attributes: {},
        references: [],
      },
      {
        id: '2',
        type: 'search',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ];

    exporter.exportByTypes.mockResolvedValueOnce(createListStream(sortedObjects));

    const result = await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_export')
      .send({
        type: 'search',
        search: 'my search string',
        includeReferencesDeep: true,
      });

    expect(result.status).toBe(200);
    expect(result.header).toEqual(
      expect.objectContaining({
        'content-disposition': 'attachment; filename="export.ndjson"',
        'content-type': 'application/ndjson',
      })
    );

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Exporting saved objects with [includeReferencesDeep] has been deprecated. Please use [include_references_deep] instead."`
    );

    const objects = (result.text as string).split('\n').map((row) => JSON.parse(row));
    expect(objects).toEqual(sortedObjects);
    expect(exporter.exportByTypes.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        excludeExportDetails: false,
        includeReferencesDeep: true,
        search: 'my search string',
        types: ['search'],
      })
    );
  });

  it('increments usage stats when a deprecated body field is used', async () => {
    const sortedObjects = [
      {
        id: '1',
        type: 'index-pattern',
        attributes: {},
        references: [],
      },
      {
        id: '2',
        type: 'search',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ];

    exporter.exportByTypes.mockResolvedValueOnce(createListStream(sortedObjects));

    await supertest(httpSetup.server.listener)
      .post('/api/saved_objects/_export')
      .send({
        type: 'search',
        search: 'my search string',
        includeReferencesDeep: true,
      })
      .expect(200);

    expect(coreUsageStatsClient.incrementSavedObjectsExport).toHaveBeenCalledWith({
      request: expect.anything(),
      types: ['search'],
      supportedTypes: ['index-pattern', 'search'],
      usedDeprecatedBodyFields: true,
    });
  });
});
