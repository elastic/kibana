/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import type { ResponseFixture } from '@kbn/connector-emulate';
import { FirecrawlConnector } from '../../specs/firecrawl/firecrawl';
import { createContractContext } from '../create_contract_context';
import { loadVendorSpecs, SILENT_LOG } from './load_vendor_specs';

const JOB_ID = '3c90c3cc-0d44-4b50-8888-8dd25736052a';

// A crawl that is still running on the first poll and finished on the second.
const fixtures: ResponseFixture[] = [
  {
    operation: { method: 'POST', path: '/crawl' },
    response: { status: 200, body: { success: true, id: JOB_ID } },
  },
  {
    operation: { method: 'GET', path: '/crawl/{id}' },
    responses: [
      { status: 200, body: { status: 'scraping', total: 1, completed: 0, data: [] } },
      {
        status: 200,
        body: {
          status: 'completed',
          total: 1,
          completed: 1,
          data: [{ markdown: '# Example', metadata: { sourceURL: 'https://example.com' } }],
        },
      },
    ],
  },
];

describe('response sequences against a connector', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("take Firecrawl's crawlAndWait through a pending status to completed, again after reset", async () => {
    const { specs } = await loadVendorSpecs({
      directory: path.resolve(__dirname, '../../specs/firecrawl/vendor_api'),
      fetchText: async (url) => {
        throw new Error(`${url} was fetched; the test uses the committed snapshot`);
      },
      log: SILENT_LOG,
    });
    const { mock, runAction } = await createContractContext({
      connector: FirecrawlConnector,
      specs,
      fixtures,
    });

    const crawl = async () => {
      const result = runAction('crawlAndWait', {
        url: 'https://example.com',
        pollIntervalMs: 1000,
      });
      await jest.advanceTimersByTimeAsync(1000);
      return (await result) as { status: string };
    };
    const polls = () =>
      mock.calls
        .filter(({ request }) => request.startsWith(`GET https://api.firecrawl.dev/v2/crawl/`))
        .map(({ status }) => status);

    expect((await crawl()).status).toBe('completed');
    expect(polls()).toEqual([200, 200]);

    mock.reset();
    expect((await crawl()).status).toBe('completed');
    expect(polls()).toEqual([200, 200]);
  });
});
