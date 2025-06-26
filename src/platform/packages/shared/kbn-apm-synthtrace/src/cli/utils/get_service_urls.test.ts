/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fetch from 'node-fetch';
import { createLogger, LogLevel } from '../../lib/utils/create_logger';
import { RunOptions } from './parse_run_cli_flags';
import { getServiceUrls } from './get_service_urls';

jest.mock('node-fetch');
jest.mock('./ssl');
jest.mock('./get_service_urls', () => ({
  ...jest.requireActual('./get_service_urls'),
  discoverAuth: jest.fn(),
}));

const { Response } = jest.requireActual('node-fetch');

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
      const expectedValidAuth = 'elastic:changeme';

      mockFetchWithAllowedSegments([expectedValidAuth]);
      await expectServiceUrls(undefined, undefined, {
        esUrl: 'http://elastic:changeme@localhost:9200',
        kibanaUrl: 'http://elastic:changeme@localhost:5601',
      });
    });

    it('should discover auth for local service urls', async () => {
      const expectedValidAuth = 'elastic:changeme';

      mockFetchWithAllowedSegments([expectedValidAuth]);
      await expectServiceUrls('http://localhost:9200', 'http://localhost:5601', {
        esUrl: 'http://elastic:changeme@localhost:9200',
        kibanaUrl: 'http://elastic:changeme@localhost:5601',
      });
    });

    it('should discover target from Kibana URL when target is not provided', async () => {
      const kibana = 'http://elastic:changeme@localhost:5601';
      const expectedValidAuth = 'elastic:changeme';

      mockFetchWithAllowedSegments([expectedValidAuth]);
      await expectServiceUrls(undefined, kibana, {
        esUrl: 'http://elastic:changeme@localhost:9200',
        kibanaUrl: 'http://elastic:changeme@localhost:5601',
      });
    });

    it('should discover Kibana URL from target when Kibana URL is not provided', async () => {
      const target = 'http://elastic:changeme@localhost:9200';
      const expectedValidAuth = 'elastic:changeme';

      mockFetchWithAllowedSegments([expectedValidAuth]);
      await expectServiceUrls(target, undefined, {
        esUrl: 'http://elastic:changeme@localhost:9200',
        kibanaUrl: 'http://elastic:changeme@localhost:5601',
      });
    });

    it('should throw an error if target URL is invalid', async () => {
      const target = 'http://invalid-kibana-url:9200';

      mockFetchWithAllowedSegments(['5601']); // Only allow Kibana URL
      await expectServiceUrls(
        target,
        undefined,
        {
          esUrl: 'http://elastic:changeme@localhost:9200',
          kibanaUrl: 'http://elastic:changeme@localhost:5601',
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
        {
          esUrl: 'http://elastic:changeme@localhost:9200',
          kibanaUrl: 'http://elastic:changeme@localhost:5601',
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
        {
          esUrl: 'http://elastic:changeme@localhost:9200',
          kibanaUrl: 'http://elastic:changeme@localhost:5601',
        },
        `Could not discover Elasticsearch URL based on Kibana URL ${kibana.replace(authStr, '.*')}.` // On CI auth is stripped
      );
    });
  });

  describe('localhost Serverless', () => {
    it('should discover local https service urls and auth if none provided', async () => {
      const expectedValidAuth = 'elastic_serverless:changeme';

      mockFetchWithAllowedSegments([
        `https://${expectedValidAuth}@localhost:9200`,
        `http://${expectedValidAuth}@localhost:5601`,
      ]); // Only allow https for ES and http for Kibana
      await expectServiceUrls(undefined, undefined, {
        esUrl: 'https://elastic_serverless:changeme@localhost:9200',
        kibanaUrl: 'http://elastic_serverless:changeme@localhost:5601',
      });
    });

    it('should discover auth for local https service urls', async () => {
      const expectedValidAuth = 'elastic_serverless:changeme';

      mockFetchWithAllowedSegments([`https://${expectedValidAuth}`]); // Only allow https urls
      await expectServiceUrls('https://localhost:9200', 'https://localhost:5601', {
        esUrl: 'https://elastic_serverless:changeme@localhost:9200',
        kibanaUrl: 'https://elastic_serverless:changeme@localhost:5601',
      });
    });

    it('throws error if target is https but https Kibana is not reachable', async () => {
      const target = 'https://elastic_serverless:changeme@localhost:9200';

      mockFetchWithAllowedSegments([target, 'http://elastic_serverless:changeme@localhost:5601']); // Only allow http Kibana URL
      await expectServiceUrls(
        target,
        undefined,
        {
          esUrl: 'https://elastic_serverless:changeme@localhost:9200',
          kibanaUrl: 'http://elastic_serverless:changeme@localhost:5601',
        },
        `Could not connect to Kibana.`
      );
    });

    it('allows a different https Kibana and a different https ES URL', async () => {
      const target = 'https://elastic_serverless:changeme@host-1:9200';
      const kibana = 'https://elastic_serverless:changeme@host-2:5601';

      mockFetchWithAllowedSegments([target, kibana]); // Allow both URLs
      await expectServiceUrls(target, kibana, {
        esUrl: 'https://elastic_serverless:changeme@host-1:9200',
        kibanaUrl: 'https://elastic_serverless:changeme@host-2:5601',
      });
    });

    it('logs the certificate warning if 127.0.0.1 is used', async () => {
      const target = 'https://elastic_serverless:changeme@127.0.0.1:9200';
      const kibana = 'https://elastic_serverless:changeme@localhost:5601';

      const warnSpy = jest.spyOn(logger, 'warning');
      mockFetchWithAllowedSegments([target, kibana]);
      await expectServiceUrls(target, kibana, {
        esUrl: 'https://elastic_serverless:changeme@127.0.0.1:9200',
        kibanaUrl: 'https://elastic_serverless:changeme@localhost:5601',
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Self-signed certificate may not work')
      );
    });
  });

  describe('Elastic Cloud', () => {
    it('should discover .kb url if .es target is provided', async () => {
      const target = 'https://username:1223334444@cluster.kb.us-west2.gcp.elastic-cloud.com';
      const expectedKibanaUrl = target.replace('.es', '.kb');

      mockFetchWithAllowedSegments([target, expectedKibanaUrl]);
      await expectServiceUrls(target, undefined, {
        esUrl: target,
        kibanaUrl: expectedKibanaUrl,
      });
    });

    it('should discover .es url if .kb Kibana is provided', async () => {
      const kibana = 'https://username:1223334444@cluster.kb.us-west2.gcp.elastic-cloud.com';
      const expectedEsUrl = kibana.replace('.kb', '.es');

      mockFetchWithAllowedSegments([kibana, expectedEsUrl]);
      await expectServiceUrls(undefined, kibana, {
        esUrl: expectedEsUrl,
        kibanaUrl: kibana,
      });
    });
  });
});

function mockFetchWithAllowedSegments(allowedUrlSegments: string[]) {
  (fetch as unknown as jest.Mock).mockImplementation(async (url: string) => {
    if (allowedUrlSegments.some((segment) => url.includes(segment))) {
      return new Response(null, { status: 200 });
    }

    throw new Error('Url not found');
  });
}

function expectServiceUrls(
  target?: string,
  kibana?: string,
  expected?: Awaited<ReturnType<typeof getServiceUrls>>,
  throws?: string
) {
  if (throws) {
    return expect(getServiceUrls({ ...runOptions, logger, target, kibana })).rejects.toThrow(
      new RegExp(throws)
    );
  }

  return expect(getServiceUrls({ ...runOptions, logger, target, kibana })).resolves.toEqual(
    expected
  );
}
