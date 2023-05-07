/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Configuration, OpenAIApi } from 'openai';
import type { CoreSetup } from '@kbn/core/server';
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
        validate: false,
      },
      async (context, request, response) => {
        debugger;
        const completion = await openAi.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content:
                'Create a simple react button component that says "Hello World" when clicked. Format the output with HTML tags.',
            },
          ],
        });

        return response.ok({
          body: {
            response: completion.data.choices[0].message?.content,
          },
        });
      }
    );
}
