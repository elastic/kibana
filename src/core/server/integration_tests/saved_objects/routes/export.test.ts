/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { createListStream } from '@kbn/utils';
import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';
import {
  coreUsageStatsClientMock,
  coreUsageDataServiceMock,
} from '@kbn/core-usage-data-server-mocks';
import { savedObjectsExporterMock } from '@kbn/core-saved-objects-import-export-server-mocks';
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import { setupServer, createExportableType } from '@kbn/core-test-helpers-test-utils';
import {
  registerExportRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;
const allowedTypes = ['index-pattern', 'search'];
const config = {
  maxImportPayloadBytes: 26214400,
  maxImportExportSize: 10000,
} as SavedObjectConfig;
let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;

describe('POST /api/saved_objects/_export', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let exporter: ReturnType<typeof savedObjectsExporterMock.create>;

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    handlerContext.savedObjects.typeRegistry.getImportableAndExportableTypes.mockReturnValue(
      allowedTypes.map(createExportableType)
    );
    exporter = handlerContext.savedObjects.getExporter();

    const router =
      httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>('/api/saved_objects/');
    handlerContext.savedObjects.getExporter = jest
      .fn()
      .mockImplementation(() => exporter as ReturnType<typeof savedObjectsExporterMock.create>);

    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsExport.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerExportRoute(router, { config, coreUsageData });

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
        includeReferencesDeep: true,
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
    });
  });
});
