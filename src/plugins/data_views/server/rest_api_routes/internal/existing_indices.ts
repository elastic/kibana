/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IRouter, RequestHandler } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { INITIAL_REST_VERSION_INTERNAL as version } from '../../constants';
import { IndexPatternsFetcher } from '../..';
import { EXISTING_INDICES_PATH } from '../../../common/constants';

/**
 * Accepts one of the following:
 * 1. An array of field names
 * 2. A JSON-stringified array of field names
 * 3. A single field name (not comma-separated)
 * @returns an array of indices
 * @param indices
 */
export const parseIndices = (indices: string | string[]): string[] => {
  if (Array.isArray(indices)) return indices;
  try {
    return JSON.parse(indices);
  } catch (e) {
    if (!indices.includes(',')) return [indices];
    throw new Error(
      'indices should be an array of index aliases, a JSON-stringified array of index aliases, or a single index alias'
    );
  }
};
export const handler: RequestHandler<{}, { indices: string | string[] }, string[]> = async (
  ctx,
  req,
  res
) => {
  const { indices } = req.query;
  try {
    const indexArray = parseIndices(indices);
    const core = await ctx.core;
    const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
    const indexPatterns = new IndexPatternsFetcher(elasticsearchClient);

    const response: string[] = await indexPatterns.getExistingIndices(indexArray);
    return res.ok({ body: response });
  } catch (error) {
    return res.badRequest();
  }
};

export const registerExistingIndicesPath = (router: IRouter): void => {
  router.versioned
    .get({
      path: EXISTING_INDICES_PATH,
      access: 'internal',
    })
    .addVersion(
      {
        version,
        validate: {
          request: {
            query: schema.object({
              indices: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
            }),
          },
          response: {
            200: {
              body: () => schema.arrayOf(schema.string()),
            },
          },
        },
      },
      handler
    );
};
