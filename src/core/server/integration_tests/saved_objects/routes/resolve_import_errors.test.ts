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
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { ICoreUsageStatsClient } from '@kbn/core-usage-data-base-server-internal';
import type { Logger, LogLevelId } from '@kbn/logging';
import {
  coreUsageStatsClientMock,
  coreUsageDataServiceMock,
} from '@kbn/core-usage-data-server-mocks';
import { setupServer, createExportableType } from '@kbn/core-test-helpers-test-utils';
import {
  LEGACY_URL_ALIAS_TYPE,
  SavedObjectConfig,
} from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsImporter } from '@kbn/core-saved-objects-import-export-server-internal';
import {
  registerResolveImportErrorsRoute,
  type InternalSavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server-internal';

type SetupServerReturn = Awaited<ReturnType<typeof setupServer>>;

const allowedTypes = ['index-pattern', 'visualization', 'dashboard'];
const config = { maxImportPayloadBytes: 26214400, maxImportExportSize: 10000 } as SavedObjectConfig;
let coreUsageStatsClient: jest.Mocked<ICoreUsageStatsClient>;
const URL = '/api/saved_objects/_resolve_import_errors';

describe(`POST ${URL}`, () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  const mockDashboard = {
    type: 'dashboard',
    id: 'my-dashboard',
    attributes: { title: 'Look at my dashboard' },
    references: [],
    managed: false,
  };
  const mockVisualization = {
    type: 'visualization',
    id: 'my-vis',
    attributes: { title: 'Look at my visualization' },
    references: [{ name: 'ref_0', type: 'index-pattern', id: 'existing' }],
    managed: false,
  };
  const mockIndexPattern = {
    type: 'index-pattern',
    id: 'existing',
    attributes: {},
    references: [],
    managed: false,
  };
  const mockLogger: jest.Mocked<Logger> = {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    log: jest.fn(),
    isLevelEnabled: jest.fn((level: LogLevelId) => true),
    get: jest.fn(() => mockLogger),
  };

  beforeEach(async () => {
    ({ server, httpSetup, handlerContext } = await setupServer());
    handlerContext.savedObjects.typeRegistry.getImportableAndExportableTypes.mockReturnValue(
      allowedTypes.map(createExportableType)
    );
    handlerContext.savedObjects.typeRegistry.getType.mockImplementation(
      (type: string) =>
        ({
          // other attributes aren't needed for the purposes of injecting metadata
          management: { icon: `${type}-icon` },
        } as any)
    );

    savedObjectsClient = handlerContext.savedObjects.getClient();
    savedObjectsClient.checkConflicts.mockResolvedValue({ errors: [] });

    const importer = new SavedObjectsImporter({
      savedObjectsClient,
      typeRegistry: handlerContext.savedObjects.typeRegistry,
      importSizeLimit: 10000,
      logger: mockLogger,
    });

    handlerContext.savedObjects.getImporter = jest
      .fn()
      .mockImplementation(() => importer as jest.Mocked<SavedObjectsImporter>);

    const router =
      httpSetup.createRouter<InternalSavedObjectsRequestHandlerContext>('/api/saved_objects/');
    coreUsageStatsClient = coreUsageStatsClientMock.create();
    coreUsageStatsClient.incrementSavedObjectsResolveImportErrors.mockRejectedValue(
      new Error('Oh no!') // intentionally throw this error, which is swallowed, so we can assert that the operation does not fail
    );
    const coreUsageData = coreUsageDataServiceMock.createSetupContract(coreUsageStatsClient);
    registerResolveImportErrorsRoute(router, { config, coreUsageData });

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
          '--BOUNDARY',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[]',
          '--BOUNDARY--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({ success: true, successCount: 0, warnings: [] });
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled(); // no objects were created
    expect(coreUsageStatsClient.incrementSavedObjectsResolveImportErrors).toHaveBeenCalledWith({
      request: expect.anything(),
      createNewCopies: false,
      compatibilityMode: false,
    });
  });

  it('defaults migrationVersion to empty object', async () => {
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [mockDashboard] });

    const result = await supertest(httpSetup.server.listener)
      .post(URL)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
          '--EXAMPLE',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[{"type":"dashboard","id":"my-dashboard"}]',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    const {
      type,
      id,
      attributes: { title },
      managed,
    } = mockDashboard;
    const meta = { title, icon: 'dashboard-icon' };
    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [{ type, id, meta, managed }],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ typeMigrationVersion: '' })],
      expect.any(Object) // options
    );
  });

  it('retries importing a dashboard', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [mockDashboard] });

    const result = await supertest(httpSetup.server.listener)
      .post(URL)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"}}',
          '--EXAMPLE',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[{"type":"dashboard","id":"my-dashboard"}]',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    const { type, id, attributes, managed } = mockDashboard;
    const meta = { title: attributes.title, icon: 'dashboard-icon' };
    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [{ type, id, meta, managed }],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [{ type, id, attributes, typeMigrationVersion: '', managed }],
      expect.objectContaining({ overwrite: undefined })
    );
  });

  it('resolves conflicts for dashboard', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [mockDashboard] });

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
          '--EXAMPLE',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[{"type":"dashboard","id":"my-dashboard","overwrite":true}]',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    const { type, id, attributes, managed } = mockDashboard;
    const meta = { title: attributes.title, icon: 'dashboard-icon' };
    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [{ type, id, meta, overwrite: true, managed }],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [{ type, id, attributes, typeMigrationVersion: '', managed }],
      expect.objectContaining({ overwrite: true })
    );
  });

  it('resolves `missing_references` errors by replacing the missing references', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [mockVisualization] });
    savedObjectsClient.bulkGet.mockResolvedValueOnce({ saved_objects: [mockIndexPattern] });

    const result = await supertest(httpSetup.server.listener)
      .post(URL)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"visualization","id":"my-vis","attributes":{"title":"Look at my visualization"},"references":[{"name":"ref_0","type":"index-pattern","id":"missing"}]}',
          '--EXAMPLE',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[{"type":"visualization","id":"my-vis","replaceReferences":[{"type":"index-pattern","from":"missing","to":"existing"}]}]',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    const { type, id, attributes, references, managed } = mockVisualization;
    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [
        {
          type: 'visualization',
          id: 'my-vis',
          meta: { title: 'Look at my visualization', icon: 'visualization-icon' },
          managed,
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [{ type, id, attributes, references, typeMigrationVersion: '', managed }],
      expect.objectContaining({ overwrite: undefined })
    );
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [{ fields: ['id'], id: 'existing', type: 'index-pattern' }],
      expect.any(Object) // options
    );
  });

  it('resolves `missing_references` errors by ignoring the missing references', async () => {
    // NOTE: changes to this scenario should be reflected in the docs
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [mockVisualization] });

    const result = await supertest(httpSetup.server.listener)
      .post(URL)
      .set('content-Type', 'multipart/form-data; boundary=EXAMPLE')
      .send(
        [
          '--EXAMPLE',
          'Content-Disposition: form-data; name="file"; filename="export.ndjson"',
          'Content-Type: application/ndjson',
          '',
          '{"type":"visualization","id":"my-vis","attributes":{"title":"Look at my visualization"},"references":[{"name":"ref_0","type":"index-pattern","id":"missing"}]}',
          '--EXAMPLE',
          'Content-Disposition: form-data; name="retries"',
          '',
          '[{"type":"visualization","id":"my-vis","ignoreMissingReferences":true}]',
          '--EXAMPLE--',
        ].join('\r\n')
      )
      .expect(200);

    const { type, id, attributes, managed } = mockVisualization;
    const references = [{ name: 'ref_0', type: 'index-pattern', id: 'missing' }];
    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [
        {
          type: 'visualization',
          id: 'my-vis',
          meta: { title: 'Look at my visualization', icon: 'visualization-icon' },
          managed,
        },
      ],
      warnings: [],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [{ type, id, attributes, references, typeMigrationVersion: '', managed }],
      expect.objectContaining({ overwrite: undefined })
    );
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  describe('createNewCopies enabled', () => {
    it('imports objects, regenerating all IDs/reference IDs present, and resetting all origin IDs', async () => {
      const mockUuid = jest.requireMock('uuid');
      mockUuid.v4 = jest.fn().mockReturnValue('new-id-1');
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
            '--EXAMPLE',
            'Content-Disposition: form-data; name="retries"',
            '',
            '[{"type":"visualization","id":"my-vis","replaceReferences":[{"type":"index-pattern","from":"my-pattern","to":"existing"}]},{"type":"dashboard","id":"my-dashboard","destinationId":"new-id-2"}]',
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
            managed: obj1.managed,
          },
          {
            type: obj2.type,
            id: 'my-dashboard',
            meta: { title: obj2.attributes.title, icon: 'dashboard-icon' },
            destinationId: obj2.id,
            managed: obj2.managed,
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
            references: [{ name: 'ref_0', type: 'index-pattern', id: 'existing' }],
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
    it('imports objects and creates legacy URL aliases', async () => {
      const mockUuid = jest.requireMock('uuid');
      mockUuid.v4 = jest.fn().mockReturnValue('new-id-1');
      savedObjectsClient.bulkGet.mockResolvedValueOnce({ saved_objects: [mockIndexPattern] });

      const obj1 = {
        type: 'visualization',
        id: 'my-vis',
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
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [obj1, obj2] });

      // Prepare mock results for the created legacy URL alias for obj2.
      const legacyUrlAliasObj2 = {
        id: `default:${obj2.type}:${obj2.originId}`,
        type: LEGACY_URL_ALIAS_TYPE,
        references: [],
        attributes: {
          sourceId: obj2.originId,
          targetNamespace: 'default',
          targetType: obj2.type,
          targetId: obj2.id,
          purpose: 'savedObjectImport',
        },
        managed: false,
      };
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [legacyUrlAliasObj2],
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
            '{"type":"dashboard","id":"my-dashboard","attributes":{"title":"Look at my dashboard"},"references":[{"name":"ref_0","type":"visualization","id":"my-vis"}]}',
            '--EXAMPLE',
            'Content-Disposition: form-data; name="retries"',
            '',
            '[{"type":"visualization","id":"my-vis","replaceReferences":[{"type":"index-pattern","from":"my-pattern","to":"existing"}]},{"type":"dashboard","id":"my-dashboard","destinationId":"new-id-2"}]',
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
            managed: obj1.managed,
          },
          {
            type: obj2.type,
            id: 'my-dashboard',
            meta: { title: obj2.attributes.title, icon: 'dashboard-icon' },
            destinationId: obj2.id,
            managed: obj2.managed,
          },
        ],
        warnings: [],
      });
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(2); // successResults objects were created because no resolvable errors are present
      expect(savedObjectsClient.bulkCreate).toHaveBeenNthCalledWith(
        1,
        [
          expect.objectContaining({
            type: 'visualization',
            id: 'my-vis',
            references: [{ name: 'ref_0', type: 'index-pattern', id: 'existing' }],
            managed: false,
          }),
          expect.objectContaining({
            type: 'dashboard',
            id: 'new-id-2',
            originId: 'my-dashboard',
            references: [{ name: 'ref_0', type: 'visualization', id: 'my-vis' }],
            managed: false,
          }),
        ],
        expect.any(Object) // options
      );
      expect(savedObjectsClient.bulkCreate).toHaveBeenNthCalledWith(
        2,
        [expect.objectContaining(legacyUrlAliasObj2)],
        expect.any(Object) // options
      );
    });
  });
});
