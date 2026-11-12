/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResponseFixture } from '@kbn/connector-emulate';

/** Where Firecrawl's API lives; the emulator answers requests to it. */
export const FIRECRAWL_VENDOR_URL = 'https://api.firecrawl.dev/v2';
export const FIRECRAWL_CRAWL_ID = '0b8e1c52-6a1f-4c3e-9d7a-2f4b5c6d7e8f';

const EXAMPLE_HOME = {
  markdown: [
    '# Example Domain',
    '',
    'This domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.',
    '',
    '[More information...](https://www.iana.org/domains/example)',
  ].join('\n'),
  metadata: {
    title: 'Example Domain',
    language: 'en',
    sourceURL: 'https://example.com',
    url: 'https://example.com/',
    statusCode: 200,
    contentType: 'text/html; charset=UTF-8',
  },
};

const EXAMPLE_DOCS = {
  markdown: [
    '# Documentation',
    '',
    'Guides and reference for working with Example.',
    '',
    '- [Getting started](https://example.com/docs/getting-started)',
    '- [API reference](https://example.com/docs/api)',
  ].join('\n'),
  metadata: {
    title: 'Documentation',
    language: 'en',
    sourceURL: 'https://example.com/docs',
    url: 'https://example.com/docs',
    statusCode: 200,
    contentType: 'text/html; charset=UTF-8',
  },
};

const crawlStatus = (status: 'scraping' | 'completed', pages: readonly object[]) => ({
  status,
  total: 2,
  completed: pages.length,
  creditsUsed: pages.length,
  createdAt: '2026-11-12T12:00:00.000Z',
  expiresAt: '2026-11-13T12:00:00.000Z',
  data: pages,
});

const operation = (method: 'get' | 'post', path: string) => ({ source: 'v2', method, path });

/**
 * What the emulator answers the Firecrawl operations with, in place of values sampled from the
 * spec: an example page, search results, a map of a site, and a crawl that finishes at its third
 * status request (the status step takes the first, crawlAndWait polls for the others). The
 * emulator only takes responses that match Firecrawl's spec.
 */
export const getFirecrawlFixtures = (): readonly ResponseFixture[] => [
  {
    operation: operation('post', '/scrape'),
    response: {
      status: 200,
      body: {
        success: true,
        data: { ...EXAMPLE_HOME, links: ['https://www.iana.org/domains/example'] },
      },
    },
  },
  {
    operation: operation('post', '/search'),
    response: {
      status: 200,
      body: {
        success: true,
        creditsUsed: 3,
        data: {
          web: [
            {
              title: 'Kibana: Explore, Visualize, and Share | Elastic',
              description:
                'Kibana is a free and open user interface that lets you visualize your Elasticsearch data and navigate the Elastic Stack.',
              url: 'https://www.elastic.co/kibana',
            },
            {
              title: 'Kibana Guide | Elastic',
              description:
                'Learn how to use Kibana to explore, visualize, and share your data, and to manage the Elastic Stack.',
              url: 'https://www.elastic.co/guide/en/kibana/current/index.html',
            },
            {
              title: 'elastic/kibana: Your window into the Elastic Stack',
              description:
                'Kibana is your window into the Elastic Stack. Explore and visualize your data, and manage your deployment.',
              url: 'https://github.com/elastic/kibana',
            },
          ],
        },
      },
    },
  },
  {
    operation: operation('post', '/map'),
    response: {
      status: 200,
      body: {
        success: true,
        links: [
          {
            url: 'https://example.com/docs',
            title: 'Documentation',
            description: 'Guides and reference for working with Example.',
          },
          {
            url: 'https://example.com/docs/getting-started',
            title: 'Getting started',
            description: 'Set up Example in a few minutes.',
          },
          {
            url: 'https://example.com/docs/api',
            title: 'API reference',
            description: 'Every endpoint of the Example API.',
          },
        ],
      },
    },
  },
  {
    operation: operation('post', '/crawl'),
    response: {
      status: 200,
      body: {
        success: true,
        id: FIRECRAWL_CRAWL_ID,
        url: `${FIRECRAWL_VENDOR_URL}/crawl/${FIRECRAWL_CRAWL_ID}`,
      },
    },
  },
  {
    operation: operation('get', '/crawl/{id}'),
    responses: [
      { status: 200, body: crawlStatus('scraping', [EXAMPLE_HOME]) },
      { status: 200, body: crawlStatus('scraping', [EXAMPLE_HOME]) },
      { status: 200, body: crawlStatus('completed', [EXAMPLE_HOME, EXAMPLE_DOCS]) },
    ],
  },
];
