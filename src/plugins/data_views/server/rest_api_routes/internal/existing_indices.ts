/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { VersionedRoute } from '@kbn/core-http-server';
import { schema } from '@kbn/config-schema';
import { IndexPatternsFetcher } from '../..';
import { EXISTING_INDICES_PATH } from '../../../common/constants';

type Handler = Parameters<VersionedRoute<any, RequestHandlerContext>['addVersion']>[1];

export const handler: Handler = async (ctx: RequestHandlerContext, req, res) => {
  const core = await ctx.core;
  const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
  const indexPatterns = new IndexPatternsFetcher(elasticsearchClient, true);

  const indices: string[] = [];
  req.url.searchParams.forEach((param) => {
    indices.push(param);
  });

  const response: string[] = await indexPatterns.getExistingIndices(indices);
  return res.ok({ body: response });
};

export const registerExistingIndicesPath = (router: IRouter): void => {
  router.versioned
    .get({
      path: EXISTING_INDICES_PATH,
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          response: {
            200: {
              body: schema.arrayOf(schema.string()),
            },
          },
        },
      },
      handler
    );
};
