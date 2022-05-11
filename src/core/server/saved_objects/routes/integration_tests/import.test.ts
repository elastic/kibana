/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('uuid');

import supertest from 'supertest';
import { registerImportRoute } from '../import';
import { savedObjectsClientMock } from '../../../mocks';
import { CoreUsageStatsClient } from '../../../core_usage_data';
import { coreUsageStatsClientMock } from '../../../core_usage_data/core_usage_stats_client.mock';
import { coreUsageDataServiceMock } from '../../../core_usage_data/core_usage_data_service.mock';
import { SavedObjectConfig } from '../../saved_objects_config';
import { setupServer, createExportableType } from '../test_utils';
import { SavedObjectsErrorHelpers, SavedObjectsImporter } from '../..';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

const allowedTypes = ['index-pattern', 'visualization', 'dashboard'];
const config = { maxImportPayloadBytes: 26214400, maxImportExportSize: 10000 } as SavedObjectConfig;
let coreUsageStatsClient: jest.Mocked<CoreUsageStatsClient>;
const URL = '/internal/saved_objects/_import';

describe(`POST ${URL}`, () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  const emptyResponse = { saved_objects: [], total: 0, per_page: 0, page: 0 };
  const mockIndexPattern = {
    type: 'index-pattern',
    id: 'my-pattern',
    attributes: { title: 'my-pattern-*' },
    references: [],
  };
  const mockDashboard = {
    type: 'dashboard',
    id: 'my-dashboard',
    attributes: { title: 'Look at my dashboard' },
    references: [],
  };

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    handlerContext.savedObjects.typeRegistry.getImportableAndExportableTypes.mockReturnValue(
      allowedTypes.map(createExportableType)
    );
    handlerContext.savedObjects.typeRegistry.getType.mockImplementation(
      (type: string) =>
        // other attributes aren't needed for the purposes of injecting metadata
        ({ management: { icon: `${type}-icon` } } as any)
    );

    savedObjectsClient = handlerContext.savedObjects.client;
    savedObjectsClient.find.mockResolvedValue(emptyResponse);
    savedObjectsClient.checkConflicts.mockResolvedValue({ errors: [] });

    const importer = new SavedObjectsImporter({
      savedObjectsClient,
      typeRegistry: handlerContext.savedObjects.typeRegistry,
      importSizeLimit: 10000,
    });
    handlerContext.savedObjects.getImporter = jest
      .fn()
      .mockImplementation(() => importer as jest.Mocked<SavedObjectsImporter>);

    const router = httpSetup.createRouter('/internal/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsImport.mockRejectedValue(new Error('Oh no!')); // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerImportRoute(router, { config, coreUsageData });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response and records usage stats', async () => {
    const result = await supertest(httpSetup.server.listener)
      .post(URL)
      .set('content-Type', 'multipart/form-data; boundary=BOUNDARY')
      .send(
        [
          '--BOUNDARY',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '',
          '--BOUNDARY--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({ success: true, successCount: 0, warnings: [] });
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled(); // no objects were created
    expect(coreUsageStatsClient.incrementSavedObjectsImport).toHaveBeenCalledWith({
      request: expect.anything(),
      createNewCopies: false,
      overwrite: false,
    });
  });

  it('defaults migrationVersion to empty object', async () => {
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [mockIndexPattern] });

    const result = await supertest(httpSetup.server.listener)
      .post(URL)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [
        {
          type: 'index-pattern',
          id: 'my-pattern',
          meta: { title: 'my-pattern-*', icon: 'index-pattern-icon' },
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ migrationVersion: {} })],
      expect.any(Object) // options
    );
  });

  it('imports an index pattern and dashboard, ignoring empty lines in the file', async () => {
    // NOTE: changes to this scenario should be reflected in the docs

    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [mockIndexPattern, mockDashboard],
    });

    const result = await supertest(httpSetup.server.listener)
      .post(URL)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
          '',
          '',
          '',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: true,
      successCount: 2,
      successResults: [
        {
          type: mockIndexPattern.type,
          id: mockIndexPattern.id,
          meta: { title: mockIndexPattern.attributes.title, icon: 'index-pattern-icon' },
        },
        {
          type: mockDashboard.type,
          id: mockDashboard.id,
          meta: { title: mockDashboard.attributes.title, icon: 'dashboard-icon' },
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
  });

  it('imports an index pattern and dashboard but has a conflict on the index pattern', async () => {
    // NOTE: changes to this scenario should be reflected in the docs

    const error = SavedObjectsErrorHelpers.createConflictError('index-pattern', 'my-pattern').output
      .payload;
    savedObjectsClient.checkConflicts.mockResolvedValue({
      errors: [{ type: mockIndexPattern.type, id: mockIndexPattern.id, error }],
    });

    const result = await supertest(httpSetup.server.listener)
      .post(URL)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: false,
      successCount: 1,
      successResults: [
        {
          type: mockDashboard.type,
          id: mockDashboard.id,
          meta: { title: mockDashboard.attributes.title, icon: 'dashboard-icon' },
        },
      ],
      errors: [
        {
          id: mockIndexPattern.id,
          type: mockIndexPattern.type,
          meta: { title: mockIndexPattern.attributes.title, icon: 'index-pattern-icon' },
          error: { type: 'conflict' },
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled(); // successResults objects were not created because resolvable errors are present
  });

  it('imports an index pattern and dashboard but has a conflict on the index pattern, with overwrite=true', async () => {
    // NOTE: changes to this scenario should be reflected in the docs

    const error = SavedObjectsErrorHelpers.createConflictError('index-pattern', 'my-pattern').output
      .payload;
    savedObjectsClient.checkConflicts.mockResolvedValue({
      errors: [{ type: mockIndexPattern.type, id: mockIndexPattern.id, error }],
    });
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [mockIndexPattern, mockDashboard],
    });

    const result = await supertest(httpSetup.server.listener)
      .post(`${URL}?overwrite=true`)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"index-pattern","id":"my-pattern","attributes":{"title":"my-pattern-*"}}',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: true,
      successCount: 2,
      successResults: [
        {
          type: mockIndexPattern.type,
          id: mockIndexPattern.id,
          meta: { title: mockIndexPattern.attributes.title, icon: 'index-pattern-icon' },
          overwrite: true,
        },
        {
          type: mockDashboard.type,
          id: mockDashboard.id,
          meta: { title: mockDashboard.attributes.title, icon: 'dashboard-icon' },
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
  });

  it('imports a visualization with missing references', async () => {
    // NOTE: changes to this scenario should be reflected in the docs

    const error = SavedObjectsErrorHelpers.createGenericNotFoundError(
      'index-pattern',
      'my-pattern-*'
    ).output.payload;
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [{ ...mockIndexPattern, error }],
    });

    const result = await supertest(httpSetup.server.listener)
      .post(URL)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"visualization","id":"my-vis","attributes":{"title":"my-vis"},"references":[{"name":"ref_0","type":"index-pattern","id":"my-pattern"}]}',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"},"references":[{"name":"ref_0","type":"visualization","id":"my-vis"}]}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: false,
      successCount: 1,
      errors: [
        {
          id: 'my-vis',
          type: 'visualization',
          meta: { title: 'my-vis', icon: 'visualization-icon' },
          error: {
            type: 'missing_references',
            references: [{ type: 'index-pattern', id: 'my-pattern' }],
          },
        },
      ],
      successResults: [
        {
          type: mockDashboard.type,
          id: mockDashboard.id,
          meta: { title: mockDashboard.attributes.title, icon: 'dashboard-icon' },
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [{ fields: ['id'], id: 'my-pattern', type: 'index-pattern' }],
      expect.any(Object) // options
    );
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled(); // no objects were created
  });

  it('imports a visualization with missing references and a conflict', async () => {
    // NOTE: changes to this scenario should be reflected in the docs

    const error1 = SavedObjectsErrorHelpers.createGenericNotFoundError(
      'index-pattern',
      'my-pattern-*'
    ).output.payload;
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [{ ...mockIndexPattern, error: error1 }],
    });
    const error2 = SavedObjectsErrorHelpers.createConflictError('index-pattern', 'my-pattern')
      .output.payload;
    savedObjectsClient.checkConflicts.mockResolvedValue({
      errors: [{ type: 'visualization', id: 'my-vis', error: error2 }],
    });

    const result = await supertest(httpSetup.server.listener)
      .post(URL)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"visualization","id":"my-vis","attributes":{"title":"my-vis"},"references":[{"name":"ref_0","type":"index-pattern","id":"my-pattern"}]}',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"},"references":[{"name":"ref_0","type":"visualization","id":"my-vis"}]}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: false,
      successCount: 1,
      errors: [
        {
          id: 'my-vis',
          type: 'visualization',
          meta: { title: 'my-vis', icon: 'visualization-icon' },
          error: {
            type: 'missing_references',
            references: [{ type: 'index-pattern', id: 'my-pattern' }],
          },
        },
        {
          id: 'my-vis',
          type: 'visualization',
          meta: { title: 'my-vis', icon: 'visualization-icon' },
          error: { type: 'conflict' },
        },
      ],
      successResults: [
        {
          type: mockDashboard.type,
          id: mockDashboard.id,
          meta: { title: mockDashboard.attributes.title, icon: 'dashboard-icon' },
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [{ fields: ['id'], id: 'my-pattern', type: 'index-pattern' }],
      expect.any(Object) // options
    );
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled(); // no objects were created
  });

  it('imports a visualization with missing references and a conflict, with overwrite=true', async () => {
    // NOTE: changes to this scenario should be reflected in the docs

    const error1 = SavedObjectsErrorHelpers.createGenericNotFoundError(
      'index-pattern',
      'my-pattern-*'
    ).output.payload;
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [{ ...mockIndexPattern, error: error1 }],
    });
    const error2 = SavedObjectsErrorHelpers.createConflictError('index-pattern', 'my-pattern')
      .output.payload;
    savedObjectsClient.checkConflicts.mockResolvedValue({
      errors: [{ type: 'visualization', id: 'my-vis', error: error2 }],
    });

    const result = await supertest(httpSetup.server.listener)
      .post(`${URL}?overwrite=true`)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"visualization","id":"my-vis","attributes":{"title":"my-vis"},"references":[{"name":"ref_0","type":"index-pattern","id":"my-pattern"}]}',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"},"references":[{"name":"ref_0","type":"visualization","id":"my-vis"}]}',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({
      success: false,
      successCount: 1,
      errors: [
        {
          id: 'my-vis',
          type: 'visualization',
          meta: { title: 'my-vis', icon: 'visualization-icon' },
          overwrite: true,
          error: {
            type: 'missing_references',
            references: [{ type: 'index-pattern', id: 'my-pattern' }],
          },
        },
      ],
      successResults: [
        {
          type: mockDashboard.type,
          id: mockDashboard.id,
          meta: { title: mockDashboard.attributes.title, icon: 'dashboard-icon' },
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [{ fields: ['id'], id: 'my-pattern', type: 'index-pattern' }],
      expect.any(Object) // options
    );
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled(); // no objects were created
  });

  describe('createNewCopies enabled', () => {
    it('imports objects, regenerating all IDs/reference IDs present, and resetting all origin IDs', async () => {
      const mockUuid = jest.requireMock('uuid');
      mockUuid.v4 = jest
        .fn()
        .mockReturnValueOnce('foo') // a uuid.v4() is generated for the request.id
        .mockReturnValueOnce('foo') // another uuid.v4() is used for the request.uuid
        .mockReturnValueOnce('new-id-1')
        .mockReturnValueOnce('new-id-2');
      savedObjectsClient.bulkGet.mockResolvedValueOnce({ saved_objects: [mockIndexPattern] });
      const obj1 = {
        type: 'visualization',
        id: 'new-id-1',
        attributes: { title: 'Look at my visualization' },
        references: [],
      };
      const obj2 = {
        type: 'dashboard',
        id: 'new-id-2',
        attributes: { title: 'Look at my dashboard' },
        references: [],
      };
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [obj1, obj2] });

      const result = await supertest(httpSetup.server.listener)
        .post(`${URL}?createNewCopies=true`)
        .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
        .send(
          [
            '--EXAMPLE',
            'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
            'Content-Type: application/ndjson',
            '',
            '{"type":"visualization","id":"my-vis","attributes":{"title":"Look at my visualization"},"references":[{"name":"ref_0","type":"index-pattern","id":"my-pattern"}]}',
            '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"},"references":[{"name":"ref_0","type":"visualization","id":"my-vis"}]}',
            '--EXAMPLE--',
          ].join('\r\n')
        )
        .expect(200);

      expect(result.body).toEqual({
        success: true,
        successCount: 2,
        successResults: [
          {
            type: obj1.type,
            id: 'my-vis',
            meta: { title: obj1.attributes.title, icon: 'visualization-icon' },
            destinationId: obj1.id,
          },
          {
            type: obj2.type,
            id: 'my-dashboard',
            meta: { title: obj2.attributes.title, icon: 'dashboard-icon' },
            destinationId: obj2.id,
          },
        ],
        warnings: [],
      });
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            type: 'visualization',
            id: 'new-id-1',
            references: [{ name: 'ref_0', type: 'index-pattern', id: 'my-pattern' }],
            originId: undefined,
          }),
          expect.objectContaining({
            type: 'dashboard',
            id: 'new-id-2',
            references: [{ name: 'ref_0', type: 'visualization', id: 'new-id-1' }],
            originId: undefined,
          }),
        ],
        expect.any(Object) // options
      );
    });
  });
});
