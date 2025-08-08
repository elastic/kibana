/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import supertest from 'supertest';
import { setupServer, SetupServerReturn } from '@kbn/core-test-helpers-test-utils';
import { registerCreateRoute } from '../register_create_route';
import { MockUrlService } from '../../../../../common/mocks';
import { httpServiceMock } from '@kbn/core/server/mocks';

const url = new MockUrlService();
const http = httpServiceMock.createSetupContract();

describe('POST /api/short_url', () => {
  let server: SetupServerReturn['server'];
  let createRouter: SetupServerReturn['createRouter'];

  beforeAll(async () => {
    const setup = await setupServer();
    server = setup.server;
    createRouter = setup.createRouter;

    url.locators.get = jest.fn().mockImplementation((locatorId) => {
      if (locatorId === 'LEGACY_SHORT_URL_LOCATOR') {
        return { id: locatorId };
      }
      return undefined;
    });

    http.basePath.get = jest.fn().mockReturnValue('');
    registerCreateRoute(createRouter(''), url, http);

    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('returns 200 and the short URL data for a valid internal URL', async () => {
    url.shortUrls.get = jest.fn().mockReturnValue({
      create: jest.fn().mockResolvedValue({
        data: { id: 'abc123', url: '/s/abc123' },
      }),
    });

    const payload = {
      locatorId: 'LEGACY_SHORT_URL_LOCATOR',
      params: {
        url: '/internal/app/path',
      },
    };

    await supertest(server.listener)
      .post('/api/short_url')
      .send(payload)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ id: 'abc123', url: '/s/abc123' });
      });
  });

  it('returns 400 if creating a short URL for an external URL', async () => {
    const payload = {
      locatorId: 'LEGACY_SHORT_URL_LOCATOR',
      params: {
        url: 'http://example.com/app/management/data/short_urls',
      },
    };

    await supertest(server.listener)
      .post('/api/short_url')
      .send(payload)
      .expect(400)
      .expect((res) => {
        expect(res.text).toContain('Can not create a short URL for an external URL.');
      });
  });

  it('returns 409 if the locator is not found', async () => {
    const payload = {
      locatorId: 'NON_EXISTENT_LOCATOR',
      params: {
        url: '/internal/path',
      },
    };

    // Override the locator mock for this test
    (url.locators.get as jest.Mock).mockReturnValueOnce(undefined);

    await supertest(server.listener)
      .post('/api/short_url')
      .send(payload)
      .expect(409)
      .expect((res) => {
        expect(res.text).toContain('Locator not found.');
      });
  });
});
