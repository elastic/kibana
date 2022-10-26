/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import { FileShareNotFoundError } from '../../../file_share_service/errors';
import { CreateRouteDefinition, FILES_API_ROUTES } from '../../api_routes';
import type { FileKind, FileShareJSON } from '../../../../common/types';

import { CreateHandler, FileKindRouter } from '../types';

export const method = 'get' as const;

const rt = {
  params: schema.object({
    id: schema.string(),
  }),
};

export type Endpoint = CreateRouteDefinition<typeof rt, { share: FileShareJSON }>;

export const handler: CreateHandler<Endpoint> = async ({ files }, req, res) => {
  const { fileService } = await files;
  const {
    params: { id },
  } = req;

  try {
    const body: Endpoint['output'] = {
      share: await fileService.asCurrentUser().getShareObject({ id }),
    };
    return res.ok({
      body,
    });
  } catch (e) {
    if (e instanceof FileShareNotFoundError) {
      return res.notFound({ body: { message: `File share with id "${id}" not found` } });
    }
    throw e;
  }
};

export function register(fileKindRouter: FileKindRouter, fileKind: FileKind) {
  if (fileKind.http.share) {
    fileKindRouter[method](
      {
        path: FILES_API_ROUTES.fileKind.getGetShareRoute(fileKind.id),
        validate: { ...rt },
        options: {
          tags: fileKind.http.share.tags,
        },
      },
      handler
    );
  }
}
