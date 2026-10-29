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
import {
  coreFeatureFlagsMock,
  securityServiceMock,
  type savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';

import { logger } from '../../kibana_services';
import { setStubKibanaServices } from '../../mocks';
import { registerUpdateRoute } from '../update/register_update_route';

describe(`update`, () => {
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
    registerUpdateRoute(versioned, undefined, false, logger);

    Object.assign(handlerContext, {
      featureFlags: coreFeatureFlagsMock.createRequestHandlerContext(),
      security: securityServiceMock.createRequestHandlerContext(),
    });

    await server.start();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await server.stop();
  });

  it('rejects creating a dashboard with an invalid ID', async () => {
    savedObjectsClient.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('dashboard', 'Invalid ID')
    );

    const result = await supertest(server.listener)
      .put('/api/dashboards/Invalid%20ID')
      .send({ title: 'title' });

    expect(result.status).toEqual(400);
    expect(result.body.message).toEqual(
      '✖ ID must contain only lowercase letters, numbers, hyphens, and underscores.'
    );
    expect(savedObjectsClient.create).not.toHaveBeenCalled();
  });
});
