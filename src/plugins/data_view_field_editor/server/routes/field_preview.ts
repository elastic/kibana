/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { HttpResponsePayload } from 'kibana/server';

import { API_BASE_PATH } from '../../common/constants';
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
  ]),
  document: schema.object({}, { unknowns: 'allow' }),
});

export const registerFieldPreviewRoute = ({ router }: RouteDependencies): void => {
  router.post(
    {
      path: `${API_BASE_PATH}/field_preview`,
      validate: {
        body: bodySchema,
      },
    },
    async (ctx, req, res) => {
      const { client } = ctx.core.elasticsearch;

      const body = JSON.stringify({
        script: req.body.script,
        context: req.body.context,
        context_setup: {
          document: req.body.document,
          index: req.body.index,
        } as any,
      });

      try {
        // Ideally we want to use the Painless _execute API to get the runtime field preview.
        // There is a current ES limitation that requires a user to have too many privileges
        // to execute the script. (issue: https://github.com/elastic/elasticsearch/issues/48856)
        // Until we find a way to execute a script without advanced privileges we are going to
        // use the Search API to get the field value (and possible errors).
        // Note: here is the PR were we changed from using Painless _execute to _search and should be
        // reverted when the ES issue is fixed: https://github.com/elastic/kibana/pull/115070
        const response = await client.asInternalUser.scriptsPainlessExecute({
          // @ts-expect-error `ExecutePainlessScriptRequest.body` does not allow `string`
          body,
        });

        const fieldValue = response.result as any[] as HttpResponsePayload;

        return res.ok({ body: { values: fieldValue } });
      } catch (error: any) {
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
