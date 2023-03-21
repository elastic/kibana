/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { Readable } from 'stream';
import type { FilesClient } from '../../../common/files_client';
import type { FileKind } from '../../../common/types';
import { fileNameWithExt } from '../common_schemas';
import { fileErrors } from '../../file';
import { getDownloadHeadersForFile } from '../common';
import { getById } from './helpers';
import type { CreateHandler, FileKindRouter } from './types';
import { CreateRouteDefinition, FILES_API_ROUTES } from '../api_routes';

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
    const body: Response = await file.downloadContent();
    return res.ok({
      body,
      headers: getDownloadHeadersForFile({ file, fileName }),
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
        options: {
          tags: fileKind.http.download.tags,
        },
      },
      handler
    );
  }
}
