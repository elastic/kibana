/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import type { SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import type { HttpServiceSetup, RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import {
  DISCOVER_SESSION_API_BASE_PATH,
  DISCOVER_SESSION_API_VERSION,
} from '../../common/constants';
import { getRouteConfig } from './get_route_config';
import { discoverSessionApiResponseSchema } from './schema';
import { registerRoutes } from './register_routes';

// The test http server is configured with a small maxPayload, so requests use a
// minimal session document and rely on schema defaults for the remaining fields.
const requestData = {
  title: 'My session',
  tabs: [
    {
      id: 'main',
      label: 'Main',
      data_source: { type: 'esql', query: 'FROM logs-* | LIMIT 10' },
    },
  ],
};

const unresolvedReferenceRequestData = {
  title: 'Session with an unresolved data view reference',
  tabs: [
    {
      id: 'main',
      label: 'Main',
      data_source: {
        type: 'data_view_reference' as const,
        ref_id: 'missing-data-view',
      },
    },
  ],
};

describe('POST /api/discover_sessions', () => {
  let server: SetupServerReturn['server'];
  let createRouter: SetupServerReturn['createRouter'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  const requestHeaders = {
    'elastic-api-version': DISCOVER_SESSION_API_VERSION,
    'kbn-xsrf': 'true',
  };

  beforeEach(async () => {
    ({ server, createRouter, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;
    savedObjectsClient.create.mockImplementation(async (type, attributes, options) => ({
      id: 'generated-id',
      type,
      attributes,
      references: options?.references ?? [],
      managed: false,
      version: 'WzEsMV0=',
    }));

    const http = {
      createRouter: () => createRouter<RequestHandlerContext>('/'),
    } as unknown as HttpServiceSetup;
    registerRoutes(http, loggerMock.create());

    await server.start();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await server.stop();
  });

  it('creates a session without an id and returns the id, data, meta envelope', async () => {
    const result = await supertest(server.listener)
      // Literal path and version on purpose: this request guards the public contract,
      // so an accidental change to the shared constants must fail here with a 404
      .post('/api/discover_sessions')
      .set({ 'elastic-api-version': '2023-10-31', 'kbn-xsrf': 'true' })
      .send({ data: requestData });

    expect(result.status).toBe(201);

    const [type, attributes, options] = savedObjectsClient.create.mock.calls[0];
    expect(type).toBe(SavedSearchType);
    expect(attributes).toEqual(
      expect.objectContaining({
        title: requestData.title,
        description: '',
        tabs: [
          expect.objectContaining({
            attributes: expect.objectContaining({
              hideChart: false,
              hideTable: false,
              sort: [],
              timeRestore: false,
            }),
          }),
        ],
      })
    );
    expect(options).not.toHaveProperty('id');
    expect(options).toHaveProperty('references');

    expect(result.body.id).toBe('generated-id');
    expect(result.body.data).toEqual(
      expect.objectContaining({
        title: requestData.title,
        description: '',
        tabs: [
          expect.objectContaining({
            hide_chart: false,
            hide_table: false,
            sort: [],
            time_restore: false,
          }),
        ],
      })
    );
    expect(result.body.meta).toEqual(expect.objectContaining({ managed: false }));
  });

  it('creates a session when its data view reference does not exist', async () => {
    const result = await supertest(server.listener)
      .post(DISCOVER_SESSION_API_BASE_PATH)
      .set(requestHeaders)
      .send({ data: unresolvedReferenceRequestData });

    expect(result.status).toBe(201);
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      SavedSearchType,
      expect.any(Object),
      expect.objectContaining({
        references: [
          expect.objectContaining({
            id: 'missing-data-view',
            type: 'index-pattern',
          }),
        ],
      })
    );
    expect(result.body.data.tabs[0].data_source).toEqual({
      type: 'data_view_reference',
      ref_id: 'missing-data-view',
    });
  });

  it('returns 400 for invalid request bodies', async () => {
    const result = await supertest(server.listener)
      .post(DISCOVER_SESSION_API_BASE_PATH)
      .set(requestHeaders)
      .send({});

    expect(result.status).toBe(400);
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
  });

  it('returns 403 when the user lacks privileges on the search saved object', async () => {
    savedObjectsClient.create.mockRejectedValue(
      SavedObjectsErrorHelpers.decorateForbiddenError(new Error('forbidden'))
    );

    const result = await supertest(server.listener)
      .post(DISCOVER_SESSION_API_BASE_PATH)
      .set(requestHeaders)
      .send({ data: requestData });

    expect(result.status).toBe(403);
  });

  it('returns a body that validates against the response schema', async () => {
    const result = await supertest(server.listener)
      .post(DISCOVER_SESSION_API_BASE_PATH)
      .set(requestHeaders)
      .send({ data: requestData });

    expect(result.status).toBe(201);
    expect(() => discoverSessionApiResponseSchema.validate(result.body)).not.toThrow();
  });

  it('returns 500 when the saved objects client fails unexpectedly', async () => {
    savedObjectsClient.create.mockRejectedValue(new Error('boom'));

    const result = await supertest(server.listener)
      .post(DISCOVER_SESSION_API_BASE_PATH)
      .set(requestHeaders)
      .send({ data: requestData });

    expect(result.status).toBe(500);
  });
});

describe('Discover sessions API route config', () => {
  it('registers the API route with public access', () => {
    const { basePath, routeConfig, routeVersion } = getRouteConfig();

    expect(basePath).toBe(DISCOVER_SESSION_API_BASE_PATH);
    expect(routeConfig.access).toBe('public');
    expect(routeVersion).toBe(DISCOVER_SESSION_API_VERSION);
  });
});
