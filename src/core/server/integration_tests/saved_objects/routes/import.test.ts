/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('uuid');

import supertest from 'supertest';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';
import {
  coreUsageStatsClientMock,
  coreUsageDataServiceMock,
} from '@kbn/core-usage-data-server-mocks';
import {
  LEGACY_URL_ALIAS_TYPE,
  SavedObjectConfig,
} from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsImporter } from '@kbn/core-saved-objects-import-export-server-internal';
import {
  registerImportRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';
import { setupServer, createExportableType } from '@kbn/core-test-helpers-test-utils';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

const allowedTypes = ['index-pattern', 'visualization', 'dashboard'];
const config = { maxImportPayloadBytes: 26214400, maxImportExportSize: 10000 } as SavedObjectConfig;
let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;
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
    managed: false,
  };
  const mockDashboard = {
    type: 'dashboard',
    id: 'my-dashboard',
    attributes: { title: 'Look at my dashboard' },
    references: [],
    managed: false,
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

    const router = httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>(
      '/internal/saved_objects/'
    );
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
      compatibilityMode: false,
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
          managed: false,
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ typeMigrationVersion: '' })],
      expect.any(Object) // options
    );
  });

  it('returns the default for managed as part of the successResults', async () => {
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
          managed: false,
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ typeMigrationVersion: '', managed: false })],
      expect.any(Object) // options
    );
  });

  it('imports an index pattern, dashboard and visualization, ignoring empty lines in the file', async () => {
    // NOTE: changes to this scenario should be reflected in the docs

    savedObjectsClient.bulkCreate.mockResolvedValueOnce({
      saved_objects: [mockIndexPattern, { ...mockDashboard, managed: false }],
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
          managed: false,
        },
        {
          type: mockDashboard.type,
          id: mockDashboard.id,
          meta: { title: mockDashboard.attributes.title, icon: 'dashboard-icon' },
          managed: false,
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
          managed: false,
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
          managed: false,
        },
        {
          type: mockDashboard.type,
          id: mockDashboard.id,
          meta: { title: mockDashboard.attributes.title, icon: 'dashboard-icon' },
          managed: false,
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
          managed: false,
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
          managed: false,
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
          managed: false,
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
        .mockReturnValueOnce('foo') // a uuidv4() is generated for the request.id
        .mockReturnValueOnce('foo') // another uuidv4() is used for the request.uuid
        .mockReturnValueOnce('new-id-1')
        .mockReturnValueOnce('new-id-2');
      savedObjectsClient.bulkGet.mockResolvedValueOnce({ saved_objects: [mockIndexPattern] });
      const obj1 = {
        type: 'visualization',
        id: 'new-id-1',
        attributes: { title: 'Look at my visualization' },
        references: [],
        managed: false,
      };
      const obj2 = {
        type: 'dashboard',
        id: 'new-id-2',
        attributes: { title: 'Look at my dashboard' },
        references: [],
        managed: false,
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
            managed: false,
          },
          {
            type: obj2.type,
            id: 'my-dashboard',
            meta: { title: obj2.attributes.title, icon: 'dashboard-icon' },
            destinationId: obj2.id,
            managed: false,
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
            managed: false,
          }),
          expect.objectContaining({
            type: 'dashboard',
            id: 'new-id-2',
            references: [{ name: 'ref_0', type: 'visualization', id: 'new-id-1' }],
            managed: false,
          }),
        ],
        expect.any(Object) // options
      );
    });
  });

  describe('compatibilityMode enabled', () => {
    it('imports objects and creates legacy URL aliases for objects that changed IDs', async () => {
      const mockUuid = jest.requireMock('uuid');
      mockUuid.v4 = jest
        .fn()
        .mockReturnValueOnce('foo') // a uuidv4() is generated for the request.id
        .mockReturnValueOnce('foo') // another uuidv4() is used for the request.uuid
        .mockReturnValueOnce('new-id-1')
        .mockReturnValueOnce('new-id-2');
      savedObjectsClient.bulkGet.mockResolvedValueOnce({ saved_objects: [mockIndexPattern] });

      // Prepare mock unresolvable conflicts for obj2 and obj3.
      savedObjectsClient.checkConflicts.mockResolvedValue({
        errors: [
          {
            type: 'visualization',
            id: 'my-vis',
            error: {
              error: 'some-error',
              message: 'some-error-message',
              statusCode: 409,
              metadata: { isNotOverwritable: true },
            },
          },
          {
            type: 'dashboard',
            id: 'my-dashboard',
            error: {
              error: 'some-error',
              message: 'some-error-message',
              statusCode: 409,
              metadata: { isNotOverwritable: true },
            },
          },
        ],
      });

      // Prepare mock results for the imported objects:
      // * obj1 - doesn't have conflicts, id won't change, and legacy URL alias won't be created.
      // * obj2 and obj3 - have unresolvable conflicts with objects in other spaces, ids will change, and legacy URL
      // aliases will be created.
      const obj1 = {
        type: 'visualization',
        id: 'my-stable-vis',
        attributes: { title: 'Look at my stable visualization' },
        references: [],
      };
      const obj2 = {
        type: 'visualization',
        id: 'new-id-1',
        originId: 'my-vis',
        attributes: { title: 'Look at my visualization' },
        references: [],
      };
      const obj3 = {
        type: 'dashboard',
        id: 'new-id-2',
        originId: 'my-dashboard',
        attributes: { title: 'Look at my dashboard' },
        references: [],
      };
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [obj1, obj2, obj3] });

      // Prepare mock results for the created legacy URL aliases (for obj1 and obj2).
      const [legacyUrlAliasObj2, legacyUrlAliasObj3] = [obj2, obj3].map(
        ({ type, originId, id }) => ({
          id: `default:${type}:${originId}`,
          type: LEGACY_URL_ALIAS_TYPE,
          references: [],
          attributes: {
            sourceId: originId,
            targetNamespace: 'default',
            targetType: type,
            targetId: id,
            purpose: 'savedObjectImport',
          },
        })
      );
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [legacyUrlAliasObj2, legacyUrlAliasObj3],
      });

      const result = await supertest(httpSetup.server.listener)
        .post(`${URL}?compatibilityMode=true`)
        .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
        .send(
          [
            '--EXAMPLE',
            'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
            'Content-Type: application/ndjson',
            '',
            '{"type":"visualization","id":"my-stable-vis","attributes":{"title":"Look at my stable visualization"},"references":[{"name":"ref_0","type":"index-pattern","id":"my-pattern"}]}',
            '{"type":"visualization","id":"my-vis","attributes":{"title":"Look at my visualization"},"references":[{"name":"ref_0","type":"index-pattern","id":"my-pattern"}]}',
            '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"},"references":[{"name":"ref_0","type":"visualization","id":"my-vis"}]}',
            '--EXAMPLE--',
          ].join('\r\n')
        )
        .expect(200);

      expect(result.body).toEqual({
        success: true,
        successCount: 3,
        successResults: [
          {
            type: obj1.type,
            id: 'my-stable-vis',
            meta: { title: obj1.attributes.title, icon: 'visualization-icon' },
          },
          {
            type: obj2.type,
            id: 'my-vis',
            meta: { title: obj2.attributes.title, icon: 'visualization-icon' },
            destinationId: obj2.id,
          },
          {
            type: obj3.type,
            id: 'my-dashboard',
            meta: { title: obj3.attributes.title, icon: 'dashboard-icon' },
            destinationId: obj3.id,
          },
        ],
        warnings: [],
      });
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(2);
      expect(savedObjectsClient.bulkCreate).toHaveBeenNthCalledWith(
        1,
        [
          expect.objectContaining({
            type: 'visualization',
            id: 'my-stable-vis',
            references: [{ name: 'ref_0', type: 'index-pattern', id: 'my-pattern' }],
          }),
          expect.objectContaining({
            type: 'visualization',
            id: 'new-id-1',
            originId: 'my-vis',
            references: [{ name: 'ref_0', type: 'index-pattern', id: 'my-pattern' }],
          }),
          expect.objectContaining({
            type: 'dashboard',
            id: 'new-id-2',
            originId: 'my-dashboard',
            references: [{ name: 'ref_0', type: 'visualization', id: 'new-id-1' }],
          }),
        ],
        expect.any(Object) // options
      );
      expect(savedObjectsClient.bulkCreate).toHaveBeenNthCalledWith(
        2,
        [expect.objectContaining(legacyUrlAliasObj2), expect.objectContaining(legacyUrlAliasObj3)],
        expect.any(Object) // options
      );
    });

    it('imports objects and creates legacy URL aliases only if object is created', async () => {
      const mockUuid = jest.requireMock('uuid');
      mockUuid.v4 = jest
        .fn()
        .mockReturnValueOnce('foo') // a uuidv4() is generated for the request.id
        .mockReturnValueOnce('foo') // another uuidv4() is used for the request.uuid
        .mockReturnValueOnce('new-id-1')
        .mockReturnValueOnce('new-id-2');
      savedObjectsClient.bulkGet.mockResolvedValueOnce({ saved_objects: [mockIndexPattern] });

      // Prepare mock unresolvable conflicts for obj1 and obj2.
      savedObjectsClient.checkConflicts.mockResolvedValue({
        errors: [
          {
            type: 'visualization',
            id: 'my-vis',
            error: {
              error: 'some-error',
              message: 'some-error-message',
              statusCode: 409,
              metadata: { isNotOverwritable: true },
            },
          },
          {
            type: 'dashboard',
            id: 'my-dashboard',
            error: {
              error: 'some-error',
              message: 'some-error-message',
              statusCode: 409,
              metadata: { isNotOverwritable: true },
            },
          },
        ],
      });

      // Prepare mock results for the imported objects:
      // * obj1 - has unresolvable conflict with the object in other spaces, id will change, and legacy URL alias will
      // be created.
      // * obj2 - has unresolvable conflict with the object in other spaces, id will change, but bulk create will fail
      // to create the object and hence the legacy URL alias won't be created.
      const obj1 = {
        type: 'visualization',
        id: 'new-id-1',
        originId: 'my-vis',
        attributes: { title: 'Look at my visualization' },
        references: [],
        managed: false,
      };
      const obj2 = {
        type: 'dashboard',
        id: 'new-id-2',
        originId: 'my-dashboard',
        attributes: { title: 'Look at my dashboard' },
        references: [],
        managed: false,
      };
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          obj1,
          {
            type: obj2.type,
            id: obj2.id,
            attributes: {},
            references: [],
            managed: false,
            error: { error: 'some-error', message: 'Why not?', statusCode: 503 },
          },
        ],
      });

      // Prepare mock results for the created legacy URL alias (for obj1 only).
      const legacyUrlAliasObj1 = {
        id: `default:${obj1.type}:${obj1.originId}`,
        type: LEGACY_URL_ALIAS_TYPE,
        references: [],
        attributes: {
          sourceId: obj1.originId,
          targetNamespace: 'default',
          targetType: obj1.type,
          targetId: obj1.id,
          purpose: 'savedObjectImport',
        },
      };
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [legacyUrlAliasObj1] });

      const result = await supertest(httpSetup.server.listener)
        .post(`${URL}?compatibilityMode=true`)
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
        success: false,
        successCount: 1,
        successResults: [
          {
            type: obj1.type,
            id: obj1.originId,
            meta: { title: obj1.attributes.title, icon: 'visualization-icon' },
            destinationId: obj1.id,
            managed: false,
          },
        ],
        errors: [
          {
            id: obj2.originId,
            type: obj2.type,
            meta: { title: obj2.attributes.title, icon: 'dashboard-icon' },
            error: {
              error: 'some-error',
              message: 'Why not?',
              statusCode: 503,
              type: 'unknown',
            },
            managed: false,
          },
        ],
        warnings: [],
      });
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(2);
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            type: 'visualization',
            id: 'new-id-1',
            originId: 'my-vis',
            references: [{ name: 'ref_0', type: 'index-pattern', id: 'my-pattern' }],
            managed: false,
          }),
          expect.objectContaining({
            type: 'dashboard',
            id: 'new-id-2',
            originId: 'my-dashboard',
            references: [{ name: 'ref_0', type: 'visualization', id: 'new-id-1' }],
            managed: false,
          }),
        ],
        expect.any(Object) // options
      );
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [expect.objectContaining(legacyUrlAliasObj1)],
        expect.any(Object) // options
      );
    });

    it('returns error if fails to create a legacy URL alias', async () => {
      const mockUuid = jest.requireMock('uuid');
      mockUuid.v4 = jest
        .fn()
        .mockReturnValueOnce('foo') // a uuidv4() is generated for the request.id
        .mockReturnValueOnce('foo') // another uuidv4() is used for the request.uuid
        .mockReturnValueOnce('new-id-1');
      savedObjectsClient.bulkGet.mockResolvedValueOnce({ saved_objects: [mockIndexPattern] });

      // Prepare mock unresolvable conflict for obj1.
      savedObjectsClient.checkConflicts.mockResolvedValue({
        errors: [
          {
            type: 'visualization',
            id: 'my-vis',
            error: {
              error: 'some-error',
              message: 'some-error-message',
              statusCode: 409,
              metadata: { isNotOverwritable: true },
            },
          },
        ],
      });

      // Prepare mock results for the imported object that has unresolvable conflict with the object in other spaces,
      // id will change, but legacy URL alias won't be created because of unexpected error.
      const obj1 = {
        type: 'visualization',
        id: 'new-id-1',
        originId: 'my-vis',
        attributes: { title: 'Look at my visualization' },
        references: [],
      };
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [{ ...obj1, managed: false }],
      });

      // Prepare mock results for the created legacy URL alias (for obj1 only).
      const legacyUrlAliasObj1 = {
        id: `default:${obj1.type}:${obj1.originId}`,
        type: LEGACY_URL_ALIAS_TYPE,
        references: [],
        attributes: {
          sourceId: obj1.originId,
          targetNamespace: 'default',
          targetType: obj1.type,
          targetId: obj1.id,
          purpose: 'savedObjectImport',
        },
      };
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          {
            type: legacyUrlAliasObj1.type,
            id: legacyUrlAliasObj1.id,
            attributes: {},
            references: [],
            error: { error: 'some-error', message: 'Why not?', statusCode: 503 },
          },
        ],
      });

      const result = await supertest(httpSetup.server.listener)
        .post(`${URL}?compatibilityMode=true`)
        .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
        .send(
          [
            '--EXAMPLE',
            'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
            'Content-Type: application/ndjson',
            '',
            '{"type":"visualization","id":"my-vis","attributes":{"title":"Look at my visualization"},"references":[{"name":"ref_0","type":"index-pattern","id":"my-pattern"}]}',
            '--EXAMPLE--',
          ].join('\r\n')
        )
        .expect(200);

      expect(result.body).toEqual({
        success: false,
        successCount: 1,
        successResults: [
          {
            type: obj1.type,
            id: obj1.originId,
            meta: { title: obj1.attributes.title, icon: 'visualization-icon' },
            destinationId: obj1.id,
            managed: false,
          },
        ],
        errors: [
          {
            id: legacyUrlAliasObj1.id,
            type: legacyUrlAliasObj1.type,
            error: {
              error: 'some-error',
              message: 'Why not?',
              statusCode: 503,
              type: 'unknown',
            },
            meta: { title: 'Legacy URL alias (my-vis -> new-id-1)', icon: 'legacy-url-alias-icon' },
            managed: false,
          },
        ],
        warnings: [],
      });
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(2);
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            type: 'visualization',
            id: 'new-id-1',
            originId: 'my-vis',
            references: [{ name: 'ref_0', type: 'index-pattern', id: 'my-pattern' }],
            managed: false,
          }),
        ],
        expect.any(Object) // options
      );
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [expect.objectContaining(legacyUrlAliasObj1)],
        expect.any(Object) // options
      );
    });
  });
});
