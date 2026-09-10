/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createLogger, LogLevel } from '../../lib/utils/create_logger';
import type { RunOptions } from './parse_run_cli_flags';
import { getServiceUrls } from './get_service_urls';

const mockedFetch = jest.spyOn(global, 'fetch');
jest.mock('./ssl');
jest.mock('./get_service_urls', () => ({
  ...jest.requireActual('./get_service_urls'),
  discoverAuth: jest.fn(),
}));

const logger = createLogger(LogLevel.debug);
const runOptions = {
  logLevel: LogLevel.debug,
  concurrency: 1,
  'assume-package-version': 'latest',
} as RunOptions;

describe('getServiceUrls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('localhost Stateful', () => {
    it('should discover local service urls and auth if none provided', async () => {
      mockFetchWithAllowedSegments(['http://localhost:9200', 'http://localhost:5601'], 1);
      await expectServiceUrls(undefined, undefined, undefined, {
        esUrl: 'http://elastic:changeme@localhost:9200',
        kibanaUrl: 'http://localhost:5601',
        esHeaders: undefined,
        kibanaHeaders: {
          Authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
        },
        username: 'elastic',
        password: 'changeme',
        apiKey: undefined,
      });
    });

    it('should discover auth for local service urls', async () => {
      mockFetchWithAllowedSegments(['http://localhost:9200', 'http://localhost:5601'], 1);
      await expectServiceUrls('http://localhost:9200', 'http://localhost:5601', undefined, {
        esUrl: 'http://elastic:changeme@localhost:9200',
        kibanaUrl: 'http://localhost:5601',
        esHeaders: undefined,
        kibanaHeaders: {
          Authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
        },
        username: 'elastic',
        password: 'changeme',
        apiKey: undefined,
      });
    });

    it('should discover target from Kibana URL when target is not provided', async () => {
      const kibana = 'http://elastic:changeme@localhost:5601';

      mockFetchWithAllowedSegments(['http://localhost:9200', 'http://localhost:5601']);
      await expectServiceUrls(undefined, kibana, undefined, {
        esUrl: 'http://elastic:changeme@localhost:9200',
        kibanaUrl: 'http://localhost:5601',
        esHeaders: undefined,
        kibanaHeaders: {
          Authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
        },
        username: 'elastic',
        password: 'changeme',
        apiKey: undefined,
      });
    });

    it('should discover Kibana URL from target when Kibana URL is not provided', async () => {
      const target = 'http://elastic:changeme@localhost:9200';
      const expectedValidAuth = 'elastic:changeme';

      mockFetchWithAllowedSegments([expectedValidAuth, 'http://localhost:5601']);
      await expectServiceUrls(target, undefined, undefined, {
        esUrl: 'http://elastic:changeme@localhost:9200',
        kibanaUrl: 'http://localhost:5601',
        esHeaders: undefined,
        kibanaHeaders: {
          Authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
        },
        username: 'elastic',
        password: 'changeme',
        apiKey: undefined,
      });
    });

    it('should throw an error if target URL is invalid', async () => {
      const target = 'http://invalid-kibana-url:9200';

      mockFetchWithAllowedSegments(['5601']); // Only allow Kibana URL
      await expectServiceUrls(
        target,
        undefined,
        undefined,
        {
          esUrl: 'http://elastic:changeme@localhost:9200',
          kibanaUrl: 'http://localhost:5601',
          esHeaders: undefined,
          kibanaHeaders: undefined,
          username: 'elastic',
          password: 'changeme',
          apiKey: undefined,
        },
        `Failed to authenticate user for ${target}`
      );
    });

    it('should throw an error if kibana URL is invalid', async () => {
      const kibana = 'http://invalid-kibana-url:5601';
      const target = 'http://elastic:changeme@localhost:9200';

      mockFetchWithAllowedSegments(['9200']); // Only allow Elasticsearch URL
      await expectServiceUrls(
        target,
        kibana,
        undefined,
        {
          esUrl: 'http://elastic:changeme@localhost:9200',
          kibanaUrl: 'http://localhost:5601',
          esHeaders: undefined,
          kibanaHeaders: undefined,
          username: 'elastic',
          password: 'changeme',
          apiKey: undefined,
        },
        `Could not connect to Kibana.`
      );
    });

    it('Fails to discover ES if Kibana URL is not reachable', async () => {
      const authStr = 'elastic:changeme@';
      const kibana = `http://${authStr}not-reachable:5601`;

      mockFetchWithAllowedSegments(['localhost']);
      await expectServiceUrls(
        undefined,
        kibana,
        undefined,
        {
          esUrl: 'http://elastic:changeme@localhost:9200',
          kibanaUrl: 'http://localhost:5601',
          esHeaders: undefined,
          kibanaHeaders: {
            Authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
          },
          username: 'elastic',
          password: 'changeme',
          apiKey: undefined,
        },
        `Could not discover Elasticsearch URL based on Kibana URL ${kibana.replace(authStr, '.*')}.` // On CI auth is stripped
      );
    });
  });

  describe('localhost Serverless', () => {
    it('should discover local https service urls and auth if none provided', async () => {
      mockFetchWithAllowedSegments(['https://localhost:9200', 'http://localhost:5601'], 2); // Only allow https for ES and http for Kibana
      await expectServiceUrls(undefined, undefined, undefined, {
        esUrl: 'https://elastic_serverless:changeme@localhost:9200',
        kibanaUrl: 'http://localhost:5601',
        esHeaders: undefined,
        kibanaHeaders: {
          Authorization: `Basic ${Buffer.from('elastic_serverless:changeme').toString('base64')}`,
        },
        username: 'elastic_serverless',
        password: 'changeme',
        apiKey: undefined,
      });
    });

    it('should discover auth for local https service urls', async () => {
      mockFetchWithAllowedSegments(['https://localhost:9200', 'https://localhost:5601'], 2); // Only allow https urls
      await expectServiceUrls('https://localhost:9200', 'https://localhost:5601', undefined, {
        esUrl: 'https://elastic_serverless:changeme@localhost:9200',
        kibanaUrl: 'https://localhost:5601',
        esHeaders: undefined,
        kibanaHeaders: {
          Authorization: `Basic ${Buffer.from('elastic_serverless:changeme').toString('base64')}`,
        },
        username: 'elastic_serverless',
        password: 'changeme',
        apiKey: undefined,
      });
    });

    it('should use apiKey when it is provided', async () => {
      const apiKey = 'myTestApiKey';
      const headers = { Authorization: `ApiKey ${apiKey}` };

      mockFetchWithAllowedSegments(['localhost']);
      await expectServiceUrls('https://localhost:9200', 'https://localhost:5601', apiKey, {
        esUrl: 'https://localhost:9200',
        kibanaUrl: 'https://localhost:5601',
        esHeaders: headers,
        kibanaHeaders: headers,
        username: undefined,
        password: undefined,
        apiKey,
      });
    });

    it('throws error if target is https but https Kibana is not reachable', async () => {
      const target = 'https://elastic_serverless:changeme@localhost:9200';

      mockFetchWithAllowedSegments([target, 'http://localhost:5601']); // Only allow http Kibana URL
      await expectServiceUrls(
        target,
        undefined,
        undefined,
        {
          esUrl: 'https://elastic_serverless:changeme@localhost:9200',
          kibanaUrl: 'https://localhost:5601',
          esHeaders: undefined,
          kibanaHeaders: {
            Authorization: `Basic ${Buffer.from('elastic_serverless:changeme').toString('base64')}`,
          },
          username: 'elastic_serverless',
          password: 'changeme',
          apiKey: undefined,
        },
        `Could not connect to Kibana.`
      );
    });

    it('allows a different https Kibana and a different https ES URL', async () => {
      const target = 'https://elastic_serverless:changeme@host-1:9200';
      const kibana = 'https://elastic_serverless:changeme@host-2:5601';
      const kibanaWithoutAuth = 'https://host-2:5601';

      mockFetchWithAllowedSegments([target, kibanaWithoutAuth]); // Allow both URLs
      await expectServiceUrls(target, kibana, undefined, {
        esUrl: 'https://elastic_serverless:changeme@host-1:9200',
        kibanaUrl: 'https://host-2:5601',
        esHeaders: undefined,
        kibanaHeaders: {
          Authorization: `Basic ${Buffer.from('elastic_serverless:changeme').toString('base64')}`,
        },
        username: 'elastic_serverless',
        password: 'changeme',
        apiKey: undefined,
      });
    });

    it('logs the certificate warning if 127.0.0.1 is used', async () => {
      const target = 'https://elastic_serverless:changeme@127.0.0.1:9200';
      const kibana = 'https://elastic_serverless:changeme@localhost:5601';
      const kibanaWithoutAuth = 'https://localhost:5601';

      const warnSpy = jest.spyOn(logger, 'warning');
      mockFetchWithAllowedSegments([target, kibanaWithoutAuth]);
      await expectServiceUrls(target, kibana, undefined, {
        esUrl: 'https://elastic_serverless:changeme@127.0.0.1:9200',
        kibanaUrl: 'https://localhost:5601',
        esHeaders: undefined,
        kibanaHeaders: {
          Authorization: `Basic ${Buffer.from('elastic_serverless:changeme').toString('base64')}`,
        },
        username: 'elastic_serverless',
        password: 'changeme',
        apiKey: undefined,
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Self-signed certificate may not work')
      );
    });
  });

  describe('Elastic Cloud', () => {
    it('should discover .kb url if .es target is provided', async () => {
      const target = 'https://username:1223334444@cluster.es.us-west2.gcp.elastic-cloud.com';
      const targetWithoutAuth = 'https://cluster.es.us-west2.gcp.elastic-cloud.com';
      const expectedKibanaUrl = targetWithoutAuth.replace('.es', '.kb');

      mockFetchWithAllowedSegments([target, expectedKibanaUrl]);
      await expectServiceUrls(target, undefined, undefined, {
        esUrl: target,
        kibanaUrl: expectedKibanaUrl,
        esHeaders: undefined,
        kibanaHeaders: {
          Authorization: `Basic ${Buffer.from('username:1223334444').toString('base64')}`,
        },
        username: 'username',
        password: '1223334444',
        apiKey: undefined,
      });
    });

    it('should discover .es url if .kb Kibana is provided', async () => {
      const kibana = 'https://username:1223334444@cluster.kb.us-west2.gcp.elastic-cloud.com';
      const kibanaWithoutAuth = 'https://cluster.kb.us-west2.gcp.elastic-cloud.com';
      const expectedEsUrl = kibana.replace('.kb', '.es');
      const expectedEsUrlWithoutAuth = kibanaWithoutAuth.replace('.kb', '.es');

      mockFetchWithAllowedSegments([kibanaWithoutAuth, expectedEsUrlWithoutAuth]);
      await expectServiceUrls(undefined, kibana, undefined, {
        esUrl: expectedEsUrl,
        kibanaUrl: kibanaWithoutAuth,
        esHeaders: undefined,
        kibanaHeaders: {
          Authorization: `Basic ${Buffer.from('username:1223334444').toString('base64')}`,
        },
        username: 'username',
        password: '1223334444',
        apiKey: undefined,
      });
    });
  });
});

function mockFetchWithAllowedSegments(allowedUrlSegments: string[], discardNRequests: number = 0) {
  let requestsCount = 0;
  mockedFetch.mockImplementation(async (url) => {
    if (allowedUrlSegments.some((segment) => (url as string).includes(segment))) {
      requestsCount++;
      if (requestsCount <= discardNRequests) {
        return new Response(null, { status: 404 });
      }
      return new Response(null, { status: 200 });
    }

    throw new Error('Url not found');
  });
}

function expectServiceUrls(
  target?: string,
  kibana?: string,
  apiKey?: string,
  expected?: Awaited<ReturnType<typeof getServiceUrls>>,
  throws?: string
) {
  if (throws) {
    return expect(
      getServiceUrls({ ...runOptions, logger, target, kibana, apiKey })
    ).rejects.toThrow(new RegExp(throws));
  }

  return expect(getServiceUrls({ ...runOptions, logger, target, kibana, apiKey })).resolves.toEqual(
    expected
  );
}
