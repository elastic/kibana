/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

import type { FilesClient } from '../../../../common/files_client';
import { CreateRouteDefinition, FILES_API_ROUTES } from '../../api_routes';
import type { FileKind, FileShareJSON } from '../../../../common/types';
import { CreateHandler, FileKindRouter } from '../types';
import * as cs from '../../common_schemas';

export const method = 'get' as const;

const rt = {
  query: schema.object({
    page: schema.maybe(cs.page),
    perPage: schema.maybe(cs.pageSize),
    forFileId: schema.maybe(schema.string()),
  }),
};

export type Endpoint = CreateRouteDefinition<
  typeof rt,
  { shares: FileShareJSON[] },
  FilesClient['listShares']
>;

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
