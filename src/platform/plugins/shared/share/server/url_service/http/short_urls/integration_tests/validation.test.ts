/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import type { RequestHandlerContext } from '@kbn/core/server';
import type { SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import { setupServer } from '@kbn/core-test-helpers-test-utils';
import { MockUrlService } from '../../../../../common/mocks';
import { registerDeleteRoute } from '../register_delete_route';
import { registerGetRoute } from '../register_get_route';
import { registerResolveRoute } from '../register_resolve_route';

const tooLongValue = 'abcdefghij'.repeat(13);
const validationCases = [
  {
    name: 'the GET ID is too short',
    method: 'get',
    path: '/api/short_url/ab',
    message: '[request params.id]: value has length [2] but it must have a minimum length of [4].',
  },
  {
    name: 'the GET ID is too long',
    method: 'get',
    path: `/api/short_url/${tooLongValue}`,
    message:
      '[request params.id]: value has length [130] but it must have a maximum length of [128].',
  },
  {
    name: 'the resolve slug is too short',
    method: 'get',
    path: '/api/short_url/_slug/aa',
    message:
      '[request params.slug]: value has length [2] but it must have a minimum length of [4].',
  },
  {
    name: 'the resolve slug is too long',
    method: 'get',
    path: `/api/short_url/_slug/${tooLongValue}`,
    message:
      '[request params.slug]: value has length [130] but it must have a maximum length of [128].',
  },
  {
    name: 'the DELETE ID is too short',
    method: 'delete',
    path: '/api/short_url/ab',
    message: '[request params.id]: value has length [2] but it must have a minimum length of [4].',
  },
  {
    name: 'the DELETE ID is too long',
    method: 'delete',
    path: `/api/short_url/${tooLongValue}`,
    message:
      '[request params.id]: value has length [130] but it must have a maximum length of [128].',
  },
] as const;

describe('short URL route validation', () => {
  let server: SetupServerReturn['server'];

  beforeAll(async () => {
    const setup = await setupServer();
    server = setup.server;
    const router = setup.createRouter<RequestHandlerContext>('');
    const url = new MockUrlService();

    registerGetRoute(router, url);
    registerResolveRoute(router, url);
    registerDeleteRoute(router, url);

    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it.each(validationCases)('returns 400 when $name', async ({ method, path, message }) => {
    const request = supertest(server.listener);
    const response = method === 'get' ? await request.get(path) : await request.delete(path);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message,
    });
  });
});
