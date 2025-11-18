/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { Readable } from 'stream';
import type { FilesClient } from '../../../common/files_client';
import type { FileKind } from '../../../common/types';
import { fileNameWithExt } from '../common_schemas';
import { fileErrors } from '../../file';
import { getFileHttpResponseOptions, getDownloadedFileName } from '../common';
import { getById, validateFileNameExtension } from './helpers';
import type { CreateHandler, FileKindRouter } from './types';
import type { CreateRouteDefinition } from '../api_routes';
import { FILES_API_ROUTES } from '../api_routes';

export const method = 'get' as const;

const rt = {
  params: schema.object({
    id: schema.string(),
    fileName: schema.maybe(fileNameWithExt),
  }),
};

export type Endpoint = CreateRouteDefinition<typeof rt, any, FilesClient['download']>;

type Response = Readable;

export const handler: CreateHandler<Endpoint> = async ({ files, fileKind }, req, res) => {
  const { fileService } = await files;
  const {
    params: { id, fileName },
  } = req;

  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;

  try {
    const invalidExtensionResponse = validateFileNameExtension(fileName, file);
    if (invalidExtensionResponse) {
      return invalidExtensionResponse;
    }

    if (file.data.size === 0) {
      return res.noContent();
    }

    const body: Response = await file.downloadContent();
    const fileHttpResponseOptions = getFileHttpResponseOptions(file);

    return res.file({
      body,
      filename: fileName ?? getDownloadedFileName(file),
      ...fileHttpResponseOptions,
    });
  } catch (e) {
    if (e instanceof fileErrors.NoDownloadAvailableError) {
      return res.notFound({ body: { message: e.message } });
    }
    throw e;
  }
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.download) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getDownloadRoute(fileKind.id),
        validate: { ...rt },
        security: {
          authz: {
            requiredPrivileges: fileKind.http.download.requiredPrivileges,
          },
        },
        options: {
          access: 'public', // The endpoint is used by <img src=""/> and should work without any special headers,
        },
      },
      handler
    );
  }
}
