/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { FilesClient } from '../../common/files_client';
import { FileJSON } from '../../common';
import { FILES_MANAGE_PRIVILEGE } from '../../common/constants';
import { FILES_API_ROUTES, CreateRouteDefinition } from './api_routes';
import { page, pageSize, fileMeta } from './common_schemas';
import type { CreateHandler, FilesRouter } from './types';

const method = 'post' as const;

const string64 = schema.string({ minLength: 1, maxLength: 64 });
const string256 = schema.string({ minLength: 1, maxLength: 256 });

export const stringOrArrayOfStrings = schema.oneOf([string64, schema.arrayOf(string64)]);
export const nameStringOrArrayOfNameStrings = schema.oneOf([string256, schema.arrayOf(string256)]);

export function toArrayOrUndefined(val?: string | string[]): undefined | string[] {
  if (val == null) return undefined;
  return Array.isArray(val) ? val : [val];
}

const rt = {
  body: schema.object({
    kind: schema.maybe(stringOrArrayOfStrings),
    status: schema.maybe(stringOrArrayOfStrings),
    extension: schema.maybe(stringOrArrayOfStrings),
    name: schema.maybe(nameStringOrArrayOfNameStrings),
    meta: fileMeta,
  }),
  query: schema.object({
    page: schema.maybe(page),
    perPage: schema.maybe(pageSize),
  }),
};

export type Endpoint = CreateRouteDefinition<
  typeof rt,
  { files: FileJSON[]; total: number },
  FilesClient['find']
>;

const handler: CreateHandler<Endpoint> = async ({ files }, req, res) => {
  const { fileService } = await files;
  const {
    body: { meta, extension, kind, name, status },
    query,
  } = req;

  const { files: results, total } = await fileService.asCurrentUser().find({
    kind: toArrayOrUndefined(kind),
    name: toArrayOrUndefined(name),
    status: toArrayOrUndefined(status),
    extension: toArrayOrUndefined(extension),
    meta: meta as Record<string, string>,
    ...query,
  });

  const body: Endpoint['output'] = {
    total,
    files: results,
  };
  return res.ok({
    body,
  });
};

export function register(router: FilesRouter) {
  router[method](
    {
      path: FILES_API_ROUTES.find,
      validate: { ...rt },
      options: {
        tags: [`access:${FILES_MANAGE_PRIVILEGE}`],
      },
    },
    handler
  );
}
