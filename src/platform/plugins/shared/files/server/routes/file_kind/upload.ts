/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, Type } from '@kbn/config-schema';
import { ReplaySubject } from 'rxjs';
import { Readable } from 'stream';
import type { FilesClient } from '../../../common/files_client';
import type { FileKind } from '../../../common/types';
import type { CreateRouteDefinition } from '../../../common/api_routes';
import { MaxByteSizeExceededError } from '../../file_client/stream_transforms/max_byte_size_transform/errors';
import { FILES_API_ROUTES } from '../api_routes';
import { fileErrors } from '../../file';
import { getById } from './helpers';
import type { FileKindRouter } from './types';
import { CreateHandler } from './types';

export const method = 'put' as const;

const rt = {
  params: schema.object({
    id: schema.string(),
  }),
  body: schema.stream() as Type<unknown>,
  query: schema.object({
    selfDestructOnAbort: schema.maybe(schema.boolean()),
  }),
};

export type Endpoint = CreateRouteDefinition<
  typeof rt,
  {
    ok: true;
    size: number;
  },
  FilesClient['upload']
>;

export const handler: CreateHandler<Endpoint> = async ({ files, fileKind }, req, res) => {
  // Ensure that we are listening to the abort stream as early as possible.
  // In local testing I found that there is a chance for us to miss the abort event
  // if we subscribe too late.
  const abort$ = new ReplaySubject();
  const sub = req.events.aborted$.subscribe(abort$);

  const { fileService } = await files;
  const { logger } = fileService;
  const {
    body: stream,
    params: { id },
  } = req;
  const { error, result: file } = await getById(fileService.asCurrentUser(), id, fileKind);
  if (error) return error;
  try {
    await file.uploadContent(stream as Readable, abort$);
  } catch (e) {
    if (e instanceof MaxByteSizeExceededError) {
      return res.customError({
        statusCode: 413,
      });
    }

    if (
      e instanceof fileErrors.ContentAlreadyUploadedError ||
      e instanceof fileErrors.UploadInProgressError
    ) {
      return res.badRequest({ body: { message: e.message } });
    } else if (e instanceof fileErrors.AbortedUploadError) {
      fileService.usageCounter?.('UPLOAD_ERROR_ABORT');
      fileService.logger.error(e);
      if (req.query.selfDestructOnAbort) {
        logger.info(
          `File (id: ${file.id}) upload aborted. Deleting file due to self-destruct flag.`
        );
        file.delete().catch(() => {}); // fire and forget
      }
      return res.customError({ body: { message: e.message }, statusCode: 499 });
    }
    throw e;
  } finally {
    sub.unsubscribe();
  }
  const body: Endpoint['output'] = { ok: true, size: file.data.size! };
  return res.ok({ body });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.create) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getUploadRoute(fileKind.id),
        validate: {
          ...rt,
        },
        options: {
          tags: fileKind.http.create.tags,
          body: {
            output: 'stream',
            parse: false,
            accepts: fileKind.allowedMimeTypes ?? 'application/octet-stream',

            // This is set to 10 GiB because the actual file size limit is
            // enforced by the file service. This is just a limit on the
            // size of the HTTP request body, but the file service will throw
            // 413 errors if the file size is larger than expected.
            maxBytes: 10 * 1024 * 1024 * 1024,
          },
        },
      },
      handler
    );
  }
}
