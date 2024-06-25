/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { FilesClient } from '../../../common/files_client';
import type { FileJSON, FileKind } from '../../../common/types';
import { CreateRouteDefinition, FILES_API_ROUTES } from '../api_routes';
import type { FileKindRouter } from './types';
import * as commonSchemas from '../common_schemas';
import { CreateHandler } from './types';

export const method = 'post' as const;

export const rt = {
  body: schema.object({
    name: commonSchemas.fileName,
    alt: commonSchemas.fileAlt,
    meta: commonSchemas.fileMeta,
    mimeType: schema.maybe(schema.string()),
  }),
};

export type Endpoint<M = unknown> = CreateRouteDefinition<
  typeof rt,
  { file: FileJSON<M> },
  FilesClient['create']
>;

export const handler: CreateHandler<Endpoint> = async ({ core, fileKind, files }, req, res) => {
  const [{ security }, { fileService }] = await Promise.all([core, files]);
  const {
    body: { name, alt, meta, mimeType },
  } = req;
  const user = security.authc.getCurrentUser();
  const file = await fileService.asCurrentUser().create({
    fileKind,
    name,
    alt,
    meta,
    user: user ? { name: user.username, id: user.profile_uid } : undefined,
    mime: mimeType,
  });
  const body: Endpoint['output'] = {
    file: file.toJSON(),
  };
  return res.ok({ body });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.create) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getCreateFileRoute(fileKind.id),
        validate: {
          ...rt,
        },
        options: {
          tags: fileKind.http.create.tags,
        },
      },
      handler
    );
  }
}
