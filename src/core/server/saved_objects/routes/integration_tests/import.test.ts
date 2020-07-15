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
import { registerImportRoute } from '../import';
import { savedObjectsClientMock } from '../../../../../core/server/mocks';
import { SavedObjectConfig } from '../../saved_objects_config';
import { setupServer, createExportableType } from '../test_utils';
import { SavedObjectsErrorHelpers } from '../..';
import { SavedObject } from '../../types';

type setupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

const allowedTypes = ['index-pattern', 'visualization', 'dashboard'];
const config = { maxImportPayloadBytes: 10485760, maxImportExportSize: 10000 } as SavedObjectConfig;
const URL = '/internal/saved_objects/_import';

describe(`POST ${URL}`, () => {
  let server: setupServerReturn['server'];
  let httpSetup: setupServerReturn['httpSetup'];
  let handlerContext: setupServerReturn['handlerContext'];
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
    mockUuidv4.mockReset();
    mockUuidv4.mockImplementation(() => jest.requireActual('uuidv4'));
    ({ server, httpSetup, handlerContext } = await setupServer());
    handlerContext.savedObjects.typeRegistry.getImportableAndExportableTypes.mockReturnValue(
      allowedTypes.map(createExportableType)
    );

    savedObjectsClient = handlerContext.savedObjects.client;
    savedObjectsClient.find.mockResolvedValue(emptyResponse);
    savedObjectsClient.checkConflicts.mockResolvedValue({ errors: [] });

    const router = httpSetup.createRouter('/internal/saved_objects/');
    registerImportRoute(router, config);

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
          '--BOUNDARY--',
        ].join('\r\n')
      )
      .expect(200);

    expect(result.body).toEqual({ success: true, successCount: 0 });
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled(); // no objects were created
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
      successResults: [{ type: 'index-pattern', id: 'my-pattern' }],
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
        { type: mockIndexPattern.type, id: mockIndexPattern.id },
        { type: mockDashboard.type, id: mockDashboard.id },
      ],
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
      successResults: [{ type: mockDashboard.type, id: mockDashboard.id }],
      errors: [
        {
          id: mockIndexPattern.id,
          type: mockIndexPattern.type,
          title: mockIndexPattern.attributes.title,
          error: { type: 'conflict' },
        },
      ],
    });
    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled(); // successResults objects were not created because resolvable errors are present
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
      successCount: 0,
      errors: [
        {
          id: 'my-vis',
          type: 'visualization',
          title: 'my-vis',
          error: {
            type: 'missing_references',
            references: [{ type: 'index-pattern', id: 'my-pattern' }],
            blocking: [{ type: 'dashboard', id: 'my-dashboard' }],
          },
        },
      ],
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
      mockUuidv4.mockReturnValueOnce('new-id-1').mockReturnValueOnce('new-id-2');
      savedObjectsClient.bulkGet.mockResolvedValueOnce({ saved_objects: [mockIndexPattern] });
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({
        saved_objects: [
          { type: 'visualization', id: 'new-id-1' } as SavedObject,
          { type: 'dashboard', id: 'new-id-2' } as SavedObject,
        ],
      });

      const result = await supertest(httpSetup.server.listener)
        .post(`${URL}?createNewCopies=true`)
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
        success: true,
        successCount: 2,
        successResults: [
          { type: 'visualization', id: 'my-vis', destinationId: 'new-id-1' },
          { type: 'dashboard', id: 'my-dashboard', destinationId: 'new-id-2' },
        ],
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
