/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import { CreateRouteDefinition, FILES_API_ROUTES } from '../../api_routes';
import type { FileKind, FileShareJSON } from '../../../../common/types';
import { CreateHandler, FileKindRouter } from '../types';

export const method = 'get' as const;

const rt = {
  query: schema.object({
    page: schema.maybe(schema.number()),
    perPage: schema.maybe(schema.number()),
    forFileId: schema.maybe(schema.string()),
  }),
};

export type Endpoint = CreateRouteDefinition<typeof rt, { shares: FileShareJSON[] }>;

export const handler: CreateHandler<Endpoint> = async ({ files }, req, res) => {
  const { fileService } = await files;
  const {
    query: { forFileId, page, perPage },
  } = req;

  const result = await fileService
    .asCurrentUser()
    .listShareObjects({ fileId: forFileId, page, perPage });

  const body: Endpoint['output'] = result;
  return res.ok({
    body,
  });
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.share) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getListShareRoute(fileKind.id),
        validate: { ...rt },
        options: {
          tags: fileKind.http.share.tags,
        },
      },
      handler
    );
  }
}
