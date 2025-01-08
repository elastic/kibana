/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { ExpiryDateInThePastError } from '../../../file_share_service/errors';
import type { FilesClient } from '../../../../common/files_client';
import { CreateHandler, FileKindRouter } from '../types';

import { CreateRouteDefinition, FILES_API_ROUTES } from '../../api_routes';
import type { FileKind, FileShareJSONWithToken } from '../../../../common/types';
import { getById } from '../helpers';

export const method = 'post' as const;

const nameRegex = /^[a-z0-9-_]+$/i;

const rt = {
  params: schema.object({
    fileId: schema.string(),
  }),
  body: schema.object({
    validUntil: schema.maybe(schema.number()),
    name: schema.maybe(
      schema.string({
        maxLength: 256,
        validate: (v) =>
          nameRegex.test(v) ? undefined : 'Only alphanumeric, "-" and "_" characters are allowed.',
      })
    ),
  }),
};

export type Endpoint = CreateRouteDefinition<
  typeof rt,
  FileShareJSONWithToken,
  FilesClient['share']
>;

export const handler: CreateHandler<Endpoint> = async ({ files, fileKind }, req, res) => {
  const { fileService } = await files;
  const {
    params: { fileId },
    body: { validUntil, name },
  } = req;

  const { error, result: file } = await getById(fileService.asCurrentUser(), fileId, fileKind);
  if (error) return error;

  try {
    const share = await file.share({ name, validUntil });
    const body: Endpoint['output'] = {
      id: share.id,
      created: share.created,
      fileId: share.fileId,
      token: share.token,
      validUntil: share.validUntil,
      name: share.name,
    };
    return res.ok({
      body,
    });
  } catch (e) {
    if (e instanceof ExpiryDateInThePastError) {
      return res.badRequest({
        body: e,
      });
    }
    throw e;
  }
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.share) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getShareRoute(fileKind.id),
        validate: { ...rt },
        options: {
          tags: fileKind.http.share.tags,
        },
      },
      handler
    );
  }
}
