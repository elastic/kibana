/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { FileKind } from '../../../common/types';
import { FilesClient } from '../../../common/files_client';
import { fileErrors } from '../../file';
import { CreateRouteDefinition, FILES_API_ROUTES } from '../api_routes';
import type { CreateHandler, FileKindRouter } from './types';

import { getById } from './helpers';

export const method = 'delete' as const;

const rt = {
  params: schema.object({
    id: schema.string(),
  }),
};

export type Endpoint = CreateRouteDefinition<typeof rt, { ok: true }, FilesClient['delete']>;

export const handler: CreateHandler<Endpoint> = async ({ files, fileKind }, req, res) => {
  const {
    params: { id },
  } = req;
  const { fileService } = await files;
  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  try {
    await file.delete();
  } catch (e) {
    if (
      e instanceof fileErrors.AlreadyDeletedError ||
      e instanceof fileErrors.UploadInProgressError
    ) {
      return res.badRequest({ body: { message: e.message } });
    }
    throw e;
  }
  const body: Endpoint['output'] = {
    ok: true,
  };
  return res.ok({ body });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.delete) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getDeleteRoute(fileKind.id),
        validate: { ...rt },
        options: {
          tags: fileKind.http.delete.tags,
        },
      },
      handler
    );
  }
}
