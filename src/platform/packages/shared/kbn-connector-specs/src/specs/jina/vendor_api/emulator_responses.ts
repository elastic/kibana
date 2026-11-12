/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResponseFixture } from '@kbn/connector-emulate';

/**
 * What the emulator answers Jina Reader with, in place of values sampled from the spec: an example
 * page as markdown, and search results. The emulator only takes responses that match Jina's specs.
 */
export const getJinaFixtures = (): readonly ResponseFixture[] => [
  {
    operation: { source: 'reader', method: 'post', path: '/' },
    response: {
      status: 200,
      body: {
        code: 200,
        status: 20000,
        data: {
          title: 'Example Domain',
          description: '',
          url: 'https://example.com/',
          content:
            '# Example Domain\n\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.\n\n[More information...](https://www.iana.org/domains/example)',
          usage: { tokens: 42 },
        },
      },
    },
  },
  {
    operation: { source: 'search', method: 'post', path: '/' },
    response: {
      status: 200,
      body: {
        code: 200,
        status: 20000,
        data: [
          {
            title: 'Kibana: Explore, Visualize, and Share | Elastic',
            url: 'https://www.elastic.co/kibana',
            description:
              'Kibana is a free and open user interface that lets you visualize your Elasticsearch data.',
            content:
              'Kibana lets you visualize your Elasticsearch data and navigate the Elastic Stack.',
            usage: { tokens: 31 },
          },
          {
            title: 'elastic/kibana: Your window into the Elastic Stack',
            url: 'https://github.com/elastic/kibana',
            description: 'Kibana is your window into the Elastic Stack.',
            content: 'Explore and visualize your data, and manage your deployment.',
            usage: { tokens: 24 },
          },
        ],
      },
    },
  },
];
