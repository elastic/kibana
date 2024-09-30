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
import { CreateRouteDefinition, FILES_API_ROUTES } from '../api_routes';
import { getById } from './helpers';
import type { CreateHandler, FileKindRouter } from './types';

export const method = 'get' as const;

const rt = {
  params: schema.object({
    id: schema.string(),
  }),
};

export type Endpoint<M = unknown> = CreateRouteDefinition<
  typeof rt,
  { file: FileJSON<M> },
  FilesClient['getById']
>;

export const handler: CreateHandler<Endpoint> = async ({ files, fileKind }, req, res) => {
  const { fileService } = await files;
  const {
    params: { id },
  } = req;
  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  const body: Endpoint['output'] = {
    file: file.toJSON(),
  };
  return res.ok({ body });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.getById) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getByIdRoute(fileKind.id),
        validate: { ...rt },
        options: {
          tags: fileKind.http.getById.tags,
        },
      },
      handler
    );
  }
}
