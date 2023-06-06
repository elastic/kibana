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

const maxTokens = 4000;
const systemPrompt =
  'You are a helpful assistant that answers questions about Kibana using the Kibana documentation.';
const notFoundPrompt =
  "I'm unable to answer the question based on the information I found in the Kibana documentation.";

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
      path: '/internal/open_ai/kibana_docs',
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
              answer: notFoundPrompt,
              references: [],
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
            bool: {
              must: [
                {
                  match: {
                    title: {
                      query,
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
                model_text: query,
              },
            },
            boost: 24,
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
              answer: notFoundPrompt,
              references: [],
            },
          });
        }

        const question = `Answer this question: ${query}`;
        const fallback = `If the answer is not contained in the supplied documentation, reply with this and nothing else: "${notFoundPrompt}"`;
        const docContent = esResults.map((result) => result.body).join(' ');
        const doc = `Using only the information from this Kibana documentation: ${docContent}`;
        const prompt = [
          query,
          doc.substring(0, maxTokens - question.length - fallback.length),
          fallback,
        ].join('\n');

        const gptResponse = await openAi.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const answer = gptResponse.data.choices[0]?.message?.content;

        if (!answer) {
          return response.ok({
            body: {
              answer: notFoundPrompt,
              references: [],
            },
          });
        }

        const isNotFound = answer
          .trim()
          .toLowerCase()
          .includes(notFoundPrompt.trim().toLowerCase());

        if (isNotFound) {
          return response.ok({
            body: {
              answer: notFoundPrompt,
              references: [],
            },
          });
        }

        return response.ok({
          body: {
            answer,
            references: esResults.map(({ title, url }) => ({ title, url })),
          },
        });
      }
    );
}
