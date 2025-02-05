/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { Readable } from 'stream';
import type { FilesClient } from '../../../common/files_client';
import { NoDownloadAvailableError } from '../../file/errors';
import { FileNotFoundError } from '../../file_service/errors';
import {
  FileShareNotFoundError,
  FileShareTokenInvalidError,
} from '../../file_share_service/errors';
import type { FilesRouter } from '../types';
import { CreateRouteDefinition, FILES_API_ROUTES } from '../api_routes';
import { getDownloadHeadersForFile, getDownloadedFileName } from '../common';
import { fileNameWithExt } from '../common_schemas';
import { CreateHandler } from '../types';

const method = 'get' as const;

const rt = {
  query: schema.object({
    token: schema.string(),
  }),
  params: schema.object({
    fileName: schema.maybe(fileNameWithExt),
  }),
};

export type Endpoint = CreateRouteDefinition<typeof rt, any, FilesClient['publicDownload']>;

const handler: CreateHandler<Endpoint> = async ({ files }, req, res) => {
  const { fileService } = await files;
  const {
    query: { token },
    params: { fileName },
  } = req;

  try {
    const file = await fileService.asInternalUser().getByToken(token);
    const body: Readable = await file.downloadContent();
    return res.file({
      body,
      filename: fileName ?? getDownloadedFileName(file),
      headers: getDownloadHeadersForFile({ file, fileName }),
    });
  } catch (e) {
    if (
      e instanceof FileNotFoundError ||
      e instanceof FileShareNotFoundError ||
      e instanceof FileShareTokenInvalidError
    ) {
      return res.badRequest({ body: { message: 'Invalid token' } });
    }
    if (e instanceof NoDownloadAvailableError) {
      return res.badRequest({
        body: { message: 'No download available. Try uploading content to the file first.' },
      });
    }

    throw e;
  }
};

export function register(router: FilesRouter) {
  router[method](
    {
      path: FILES_API_ROUTES.public.download,
      validate: { ...rt },
      options: {
        authRequired: false,
        access: 'public',
      },
    },
    handler
  );
}
