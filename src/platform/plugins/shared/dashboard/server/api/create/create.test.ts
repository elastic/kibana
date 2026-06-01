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
import type { RequestHandlerContext } from '@kbn/core/server';
import { type savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { DashboardSavedObjectAttributes } from '../../dashboard_saved_object';
import { coreServices, taggingService, logger } from '../../kibana_services';
import { setStubKibanaServices } from '../../mocks';
import { registerCreateRoute } from './register_create_route';

const input: DashboardSavedObjectAttributes = {
  pinned_panels: { panels: {} },
  description: 'description',
  kibanaSavedObjectMeta: {
    searchSourceJSON: JSON.stringify({ query: { query: 'test', language: 'KQL' } }),
  },
  optionsJSON: JSON.stringify({}),
  panelsJSON: JSON.stringify([]),
  refreshInterval: { pause: true, value: 1000 },
  sections: [],
  timeFrom: 'now-15m',
  timeRestore: true,
  timeTo: 'now',
  title: 'title',
};

describe(`create`, () => {
  let server: SetupServerReturn['server'];
  let createRouter: SetupServerReturn['createRouter'];
  let handlerContext: SetupServerReturn['handlerContext'];
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeAll(() => {
    setStubKibanaServices();
  });

  beforeEach(async () => {
    ({ server, createRouter, handlerContext } = await setupServer());
    savedObjectsClient = handlerContext.savedObjects.client;
    const { versioned } = createRouter<RequestHandlerContext>('/');
    registerCreateRoute(versioned, undefined, false, logger);

    savedObjectsClient.create.mockResolvedValue({
      id: 'test-dashboard',
      type: 'dashboard',
      attributes: input,
      references: [],
    });

    await server.start();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await server.stop();
  });

  it('succesfully creates a dashboard', async () => {
    const result = await supertest(server.listener)
      .post(`/api/dashboards`)
      .send({ title: 'title' });
    expect(result.status).toEqual(201);
  });

  it('silences error when thrown in tracking', async () => {
    coreServices.userActivity.trackUserAction = jest.fn().mockImplementationOnce(() => {
      throw new Error('there was a tracking error!');
    });
    const result = await supertest(server.listener)
      .post(`/api/dashboards`)
      .send({ title: 'title' });
    expect(result.status).toEqual(201);
  });

  it('tracks create action - no tags', async () => {
    await supertest(server.listener).post(`/api/dashboards`).send({ title: 'title' });
    expect(coreServices.userActivity.trackUserAction).toBeCalledWith({
      event: {
        action: 'dashboard_create',
        type: 'creation',
      },
      message: `User created dashboard "title" (id: test-dashboard).`,
      object: {
        id: 'test-dashboard',
        name: 'title',
        tags: [],
        type: 'dashboard',
      },
    });
  });

  it('tracks create action - with tags', async () => {
    const references = [
      {
        type: 'tag',
        id: 'tag1',
        name: 'tag-ref-tag1',
      },
      {
        type: 'tag',
        id: 'tag2',
        name: 'tag-ref-tag2',
      },
    ];
    savedObjectsClient.create.mockResolvedValueOnce({
      id: 'test-dashboard',
      type: 'dashboard',
      attributes: input,
      references,
    });

    taggingService!.createTagClient = jest.fn().mockReturnValue({
      get: jest.fn().mockImplementation(
        async (id) =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ name: id }), 10);
          })
      ),
    });

    await supertest(server.listener).post(`/api/dashboards`).send({ title: 'title' });
    expect(coreServices.userActivity.trackUserAction).toBeCalledWith({
      event: {
        action: 'dashboard_create',
        type: 'creation',
      },
      message: `User created dashboard "title" (id: test-dashboard).`,
      object: {
        id: 'test-dashboard',
        name: 'title',
        tags: ['tag1', 'tag2'],
        type: 'dashboard',
      },
    });
  });
});
