/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export function defineRoutes({ core }: { core: CoreSetup }) {
  const router = core.http.createRouter();

  router.versioned
    .get({
      access: 'internal',
      path: '/internal/help_center/kibana_docs',
    })
    .addVersion(
      {
        version: '2023-05-07',
        validate: {
          request: {
            query: schema.object({
              query: schema.maybe(schema.string()),
            }),
          },
        },
      },
      async (context, request, response) => {
        const query = request.query.query?.trim();

        if (!query) {
          return response.ok({
            body: {
              links: [],
            },
          });
        }

        const coreContext = await context.core;
        const esResponse = await coreContext.elasticsearch.client.asCurrentUser.search({
          index: 'search-kibana-docs',
          fields: ['title', 'body_content', 'url'],
          size: 5,
          _source: false,
          query: {
            match: {
              body_content: query,
            },
          },
        });

        const esResults = esResponse.hits.hits.map((hit) => ({
          title: hit.fields?.title[0],
          body: hit.fields?.body_content[0],
          url: hit.fields?.url[0],
        }));

        if (!esResults.length) {
          return response.ok({
            body: {
              links: [],
            },
          });
        }

        return response.ok({
          body: {
            links: esResults.map(({ title, url }) => ({ title, url })),
          },
        });
      }
    );
}
