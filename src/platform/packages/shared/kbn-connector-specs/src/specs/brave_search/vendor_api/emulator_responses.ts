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
 * What the emulator answers Brave Search with, in place of values sampled from the spec: a web
 * search for kibana. The emulator only takes responses that match Brave's spec.
 */
export const getBraveSearchFixtures = (): readonly ResponseFixture[] => [
  {
    operation: { source: 'search', method: 'get', path: '/v1/web/search' },
    response: {
      status: 200,
      body: {
        type: 'search',
        query: { original: 'kibana', show_strict_warning: false, is_navigational: false },
        web: {
          type: 'search',
          results: [
            {
              type: 'search_result',
              title: 'Kibana: Explore, Visualize, and Share | Elastic',
              url: 'https://www.elastic.co/kibana',
              description:
                'Kibana is a free and open user interface that lets you visualize your Elasticsearch data and navigate the Elastic Stack.',
              language: 'en',
              family_friendly: true,
            },
            {
              type: 'search_result',
              title: 'Kibana Guide | Elastic',
              url: 'https://www.elastic.co/guide/en/kibana/current/index.html',
              description:
                'Learn how to use Kibana to explore, visualize, and share your data, and to manage the Elastic Stack.',
              language: 'en',
              family_friendly: true,
            },
            {
              type: 'search_result',
              title: 'elastic/kibana: Your window into the Elastic Stack',
              url: 'https://github.com/elastic/kibana',
              description:
                'Kibana is your window into the Elastic Stack. Explore and visualize your data, and manage your deployment.',
              language: 'en',
              family_friendly: true,
            },
          ],
          family_friendly: true,
        },
      },
    },
  },
];
