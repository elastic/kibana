/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
// import { HttpResponsePayload } from '@kbn/core/server';
import { FIELD_PREVIEW_PATH as path } from '../../common/constants';
import { RouteDependencies } from '../types';
import { handleEsError } from '../shared_imports';

const bodySchema = schema.object({
  index: schema.string(),
  script: schema.object({ source: schema.string() }),
  context: schema.oneOf([
    schema.literal('boolean_field'),
    schema.literal('date_field'),
    schema.literal('double_field'),
    schema.literal('geo_point_field'),
    schema.literal('ip_field'),
    schema.literal('keyword_field'),
    schema.literal('long_field'),
    schema.literal('composite_field'),
  ]),
  document: schema.object({}, { unknowns: 'allow' }),
});

const valueSchema = schema.oneOf([schema.boolean(), schema.number(), schema.string()]);

export const registerFieldPreviewRoute = ({ router }: RouteDependencies): void => {
  router.versioned.post({ path, access: 'internal' }).addVersion(
    {
      version: '1',
      validate: {
        request: {
          body: bodySchema,
        },
        response: {
          200: {
            body: schema.object({
              values: schema.oneOf([
                // composite field
                schema.recordOf(schema.string(), valueSchema),
                // primitive field
                schema.arrayOf(valueSchema),
              ]),
            }),
          },
        },
      },
    },
    async (ctx, req, res) => {
      const { client } = (await ctx.core).elasticsearch;

      const body = {
        script: req.body.script,
        context: req.body.context,
        context_setup: {
          document: req.body.document,
          index: req.body.index,
        },
      };

      try {
        // client types need to be update to support this request format
        // @ts-expect-error
        const { result } = await client.asCurrentUser.scriptsPainlessExecute(body);
        const fieldValue = result;

        console.log('field preview result', fieldValue);

        return res.ok({ body: { values: fieldValue } });
      } catch (error) {
        // Assume invalid painless script was submitted
        // Return 200 with error object
        const handleCustomError = () => {
          return res.ok({
            body: { values: [], ...error.body },
          });
        };

        return handleEsError({ error, response: res, handleCustomError });
      }
    }
  );
};
