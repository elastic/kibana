/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';

export function registerPreviewScriptedFieldRoute(router: IRouter): void {
  router.post(
    {
      path: '/internal/index-pattern-management/preview_scripted_field',
      validate: {
        body: schema.object({
          index: schema.string(),
          name: schema.string(),
          script: schema.string(),
          query: schema.maybe(schema.object({}, { unknowns: 'allow' })),
          additionalFields: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (context, request, res) => {
      const client = context.core.elasticsearch.client.asCurrentUser;
      const { index, name, script, query, additionalFields } = request.body;

      try {
        const response = await client.search(
          {
            index,
            body: {
              _source:
                additionalFields && additionalFields.length > 0 ? additionalFields : undefined,
              size: 10,
              timeout: '30s',
              query: query ?? { match_all: {} },
              script_fields: {
                [name]: {
                  script: {
                    lang: 'painless',
                    source: script,
                  },
                },
              },
            },
          },
          { meta: true }
        );

        return res.ok({ body: response });
      } catch (err) {
        return res.customError({
          statusCode: err.statusCode || 500,
          body: {
            message: err.message,
            attributes: {
              error: err.body?.error || err.message,
            },
          },
        });
      }
    }
  );
}
