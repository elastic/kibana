/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { FileJSON, FileKind } from '../../../common/types';
import type { FilesClient } from '../../../common/files_client';
import type { CreateHandler, FileKindRouter } from './types';
import { CreateRouteDefinition, FILES_API_ROUTES } from '../api_routes';
import { getById } from './helpers';

import * as commonSchemas from '../common_schemas';

export const method = 'patch' as const;

const rt = {
  body: schema.object({
    name: schema.maybe(commonSchemas.fileName),
    alt: schema.maybe(commonSchemas.fileAlt),
    meta: schema.maybe(commonSchemas.fileMeta),
  }),
  params: schema.object({
    id: schema.string(),
  }),
};

export type Endpoint<M = unknown> = CreateRouteDefinition<
  typeof rt,
  { file: FileJSON<M> },
  FilesClient['update']
>;

export const handler: CreateHandler<Endpoint> = async ({ files, fileKind }, req, res) => {
  const { fileService } = await files;
  const {
    params: { id },
    body: attrs,
  } = req;
  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  await file.update(attrs);
  const body: Endpoint['output'] = {
    file: file.toJSON(),
  };
  return res.ok({ body });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.update) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getUpdateRoute(fileKind.id),
        validate: { ...rt },
        options: {
          tags: fileKind.http.update.tags,
        },
      },
      handler
    );
  }
}
