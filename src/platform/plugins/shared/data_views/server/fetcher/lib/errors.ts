/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { CustomHttpResponseOptions } from '@kbn/core/server';
import { get } from 'lodash';

const ERR_ES_INDEX_NOT_FOUND = 'index_not_found_exception';
const ERR_NO_MATCHING_INDICES = 'no_matching_indices';

/**
 *  Determines if an error is an elasticsearch error that's
 *  describing a failure caused by missing index/indices
 *  @param  err
 *  @return {Boolean}
 */
export function isEsIndexNotFoundError(err: unknown) {
  return get(err, ['body', 'error', 'type']) === ERR_ES_INDEX_NOT_FOUND;
}

/**
 *  Creates an error that informs that no indices match the given pattern.
 *
 *  @param  {String} pattern the pattern which indexes were supposed to match
 *  @return {Boom}
 */
export function createNoMatchingIndicesError(pattern: string[] | string) {
  const err = Boom.notFound(`No indices match "${pattern}"`);
  (err as Boom.Boom).output.payload.code = ERR_NO_MATCHING_INDICES;
  return err;
}

/**
 *  Determines if an error is produced by `createNoMatchingIndicesError()`
 *
 *  @param  err
 *  @return {Boolean}
 */
export function isNoMatchingIndicesError(err: unknown) {
  return get(err, ['output', 'payload', 'code']) === ERR_NO_MATCHING_INDICES;
}

/**
 *  Wrap "index_not_found_exception" errors in custom Boom errors
 *  automatically
 *  @param  {Array<String>|String} indices
 *  @param  {Boom.Boom|CustomHttpResponseOptions} error
 *  @return {Boom}
 */
export function convertEsError(indices: string[] | string, error: unknown) {
  if (isEsIndexNotFoundError(error)) {
    return createNoMatchingIndicesError(indices);
  }

  if ((error as Boom.Boom).isBoom) {
    return error;
  }

  const custom = error as CustomHttpResponseOptions<{ error: string; message: string }>;
  const options = {
    statusCode: custom.statusCode,
    message: custom.body?.error ?? undefined,
  };

  return Boom.boomify(error as Error, options);
}
