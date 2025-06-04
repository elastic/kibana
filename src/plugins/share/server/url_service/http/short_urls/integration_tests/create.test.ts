/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import supertest from 'supertest';
import { UnwrapPromise } from '@kbn/utility-types';
import { setupServer } from 'src/core/server/test_utils';
import { httpServiceMock } from 'src/core/server/mocks';
import { MockUrlService } from '../../../../../common/mocks';
import { registerCreateRoute } from '../register_create_route';

const url = new MockUrlService();
const http = httpServiceMock.createSetupContract();

type SetupServerReturn = UnwrapPromise<ReturnType<typeof setupServer>>;

describe('POST /api/short_url', () => {
  let server: SetupServerReturn['server'];
  let httpSetup: SetupServerReturn['httpSetup'];

  beforeAll(async () => {
    const setup = await setupServer();
    server = setup.server;
    httpSetup = setup.httpSetup;

    url.locators.get = jest.fn().mockImplementation((locatorId) => {
      if (locatorId === 'LEGACY_SHORT_URL_LOCATOR') {
        return { id: locatorId };
      }
      return undefined;
    });

    http.basePath.get = jest.fn().mockReturnValue('');
    registerCreateRoute(httpSetup.createRouter(''), url, http);

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

    await supertest(httpSetup.server.listener)
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

    await supertest(httpSetup.server.listener)
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

    await supertest(httpSetup.server.listener)
      .post('/api/short_url')
      .send(payload)
      .expect(409)
      .expect((res) => {
        expect(res.text).toContain('Locator not found.');
      });
  });
});
