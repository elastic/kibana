/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { REPO_ROOT } from '@kbn/repo-info';
import { getDocgen } from '../lib/docgen_cache';
import { resolveComponentSource } from '../lib/resolve_component_source';

export const docgenQuerySchema = schema.object({
  component: schema.string({ minLength: 1 }),
  from: schema.string({ minLength: 1 }),
});

export type DocgenQuery = TypeOf<typeof docgenQuerySchema>;

type DocgenResponse =
  | { ok: true; props: Record<string, unknown> }
  | { ok: false; error: 'resolve_failed' | 'parse_failed' | 'path_not_allowed' };

interface DocgenOptions {
  req: KibanaRequest<unknown, DocgenQuery, unknown>;
  res: KibanaResponseFactory;
  logger: Logger;
}

export const handleDocgen = ({
  req,
  res,
  logger,
}: DocgenOptions): IKibanaResponse<DocgenResponse> => {
  const { component, from } = req.query;

  // Path safety — only allow files within the Kibana repo.
  if (!from.startsWith(REPO_ROOT)) {
    return res.ok({ body: { ok: false, error: 'path_not_allowed' } });
  }

  const definitionFile = resolveComponentSource(from, component, logger);

  if (!definitionFile) {
    logger.debug(`[docgen] ${component} RESOLVE_FAILED from=${from}`);
    return res.ok({ body: { ok: false, error: 'resolve_failed' } });
  }

  const result = getDocgen(definitionFile, component);

  if (!result) {
    logger.debug(`[docgen] ${component} PARSE_FAILED path=${definitionFile}`);
    return res.ok({ body: { ok: false, error: 'parse_failed' } });
  }

  const { docs, hitMs, miss } = result;
  const matched = docs.find((d) => d.displayName === component);
  const label = miss ? 'MISS' : 'HIT';
  logger.info(`[docgen] ${component} ${definitionFile} ${label} ${hitMs}ms`);

  if (!matched) {
    return res.ok({ body: { ok: false, error: 'parse_failed' } });
  }

  return res.ok({ body: { ok: true, props: matched.props as Record<string, unknown> } });
};
