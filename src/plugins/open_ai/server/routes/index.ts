/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Configuration, OpenAIApi } from 'openai';
import type { CoreSetup } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { OpenAiConfig } from '../config';

export function defineRoutes({
  core,
  config: { apiKey },
}: {
  core: CoreSetup;
  config: OpenAiConfig;
}) {
  const router = core.http.createRouter();
  const configuration = new Configuration({ apiKey });
  const openAi = new OpenAIApi(configuration);

  router.versioned
    .get({
      access: 'internal',
      path: '/internal/open_ai/example',
    })
    .addVersion(
      {
        version: '2023-05-07',
        // validate: false,
        validate: {
          request: {
            query: schema.object({
              query: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        debugger;
        const queryText = request.query.query;
        // const completion = await openAi.createChatCompletion({
        //   model: 'gpt-3.5-turbo',
        //   messages: [
        //     {
        //       role: 'user',
        //       content: queryText,
        //     },
        //   ],
        // });

        const coreContext = await context.core;
        const resp = await coreContext.elasticsearch.client.asCurrentUser.search({
          index: 'search-kibana-docs',
          fields: ['title', 'body_content', 'url'],
          size: 1,
          _source: false,
          query: {
            bool: {
              must: [
                {
                  match: {
                    title: {
                      query: queryText,
                      boost: 1,
                    },
                  },
                },
              ],
              filter: [
                {
                  exists: {
                    field: 'title-vector',
                  },
                },
              ],
            },
          },
          knn: {
            field: 'title-vector',
            k: 1,
            num_candidates: 20,
            // @ts-ignore
            query_vector_builder: {
              text_embedding: {
                model_id: 'sentence-transformers__all-mpnet-base-v2',
                model_text: queryText,
              },
            },
            boost: 24,
          },
        });

        // const body = resp.hits.hits[0].fields?.body_content[0];
        // const url = resp.hits.hits[0].fields?.url[0];

        return response.ok({
          body: {
            // response: completion.data.choices[0].message?.content,
          },
        });
      }
    );
}
