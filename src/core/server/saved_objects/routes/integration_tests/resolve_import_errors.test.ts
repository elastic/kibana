/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { mockUuidv4 } from '../../import/__mocks__';
import supertest from 'supertest';
import { UnwrapPromise } from '@kbn/utility-types';
import { registerResolveImportErrorsRoute } from '../resolve_import_errors';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { setupServer, createExportableType } from '../test_utils';
import { SavedObjectConfig } from '../../saved_objects_config';

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

const { v4: uuidv4 } = jest.requireActual('uuid');
const allowedTypes = ['index-pattern', 'visualization', 'dashboard'];
const config = { maxImportPayloadBytes: 10485760, maxImportExportSize: 10000 } as SavedObjectConfig;
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
  };
  const mockVisualization = {
    type: 'visualization',
    id: 'my-vis',
    attributes: { title: 'Look at my visualization' },
    references: [{ name: 'ref_0', type: 'index-pattern', id: 'existing' }],
  };
  const mockIndexPattern = {
    type: 'index-pattern',
    id: 'existing',
    attributes: {},
    references: [],
  };

  beforeEach(async () => {
    mockUuidv4.mockReset();
    mockUuidv4.mockImplementation(() => uuidv4());
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

    savedObjectsClient = handlerContext.savedObjects.client;
    savedObjectsClient.checkConflicts.mockResolvedValue({ errors: [] });

    const router = httpSetup.createRouter('/api/saved_objects/');
    registerResolveImportErrorsRoute(router, config);

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('formats successful response', async () => {
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

    expect(result.body).toEqual({ success: true, successCount: 0 });
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled(); // no objects were created
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
    } = mockDashboard;
    const meta = { title, icon: 'dashboard-icon' };
    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [{ type, id, meta }],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ migrationVersion: {} })],
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

    const { type, id, attributes } = mockDashboard;
    const meta = { title: attributes.title, icon: 'dashboard-icon' };
    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [{ type, id, meta }],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [{ type, id, attributes, migrationVersion: {} }],
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

    const { type, id, attributes } = mockDashboard;
    const meta = { title: attributes.title, icon: 'dashboard-icon' };
    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [{ type, id, meta, overwrite: true }],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [{ type, id, attributes, migrationVersion: {} }],
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

    const { type, id, attributes, references } = mockVisualization;
    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [
        {
          type: 'visualization',
          id: 'my-vis',
          meta: { title: 'Look at my visualization', icon: 'visualization-icon' },
        },
      ],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [{ type, id, attributes, references, migrationVersion: {} }],
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

    const { type, id, attributes } = mockVisualization;
    const references = [{ name: 'ref_0', type: 'index-pattern', id: 'missing' }];
    expect(result.body).toEqual({
      success: true,
      successCount: 1,
      successResults: [
        {
          type: 'visualization',
          id: 'my-vis',
          meta: { title: 'Look at my visualization', icon: 'visualization-icon' },
        },
      ],
    });
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
    expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      [{ type, id, attributes, references, migrationVersion: {} }],
      expect.objectContaining({ overwrite: undefined })
    );
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  describe('createNewCopies enabled', () => {
    it('imports objects, regenerating all IDs/reference IDs present, and resetting all origin IDs', async () => {
      mockUuidv4.mockReturnValue('new-id-1');
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
          },
          {
            type: obj2.type,
            id: 'my-dashboard',
            meta: { title: obj2.attributes.title, icon: 'dashboard-icon' },
            destinationId: obj2.id,
          },
        ],
      });
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1); // successResults objects were created because no resolvable errors are present
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            type: 'visualization',
            id: 'new-id-1',
            references: [{ name: 'ref_0', type: 'index-pattern', id: 'existing' }],
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
