/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, KibanaResponseFactory } from '@kbn/core/server';
import { ANNOTATIONS_API_PATH } from '../../common/annotations';
import type { AnnotationsClient } from './annotations_client';
import { AnnotationsLimitError } from './limit_error';
import {
  IMPORT_MAX_BYTES,
  annotationPatchSchema,
  idParamsSchema,
  importBodySchema,
  newAnnotationSchema,
  parseImport,
} from './schemas';

const security = {
  authz: {
    enabled: false,
    reason:
      'Development-only review tool: the routes exist only while the developer toolbar is enabled and store UI comments intentionally shared by every authenticated user.',
  },
} as const;

const access = { access: 'internal' } as const;

/** Limit violations are the user's to act on; anything else is an internal error. */
const rejectOrRethrow = (response: KibanaResponseFactory, error: unknown) => {
  if (error instanceof AnnotationsLimitError) {
    return response.badRequest({ body: { message: error.message } });
  }
  throw error;
};

export const registerAnnotationsRoutes = (router: IRouter, client: Promise<AnnotationsClient>) => {
  router.get(
    { path: ANNOTATIONS_API_PATH, security, options: access, validate: false },
    async (_context, _request, response) => response.ok({ body: await (await client).list() })
  );

  router.get(
    { path: `${ANNOTATIONS_API_PATH}/export`, security, options: access, validate: false },
    async (_context, _request, response) => {
      const payload = await (await client).exportAll();
      // An export the import route would refuse is of no use; better not to hand it out.
      const bytes = Buffer.byteLength(JSON.stringify(payload));
      if (bytes > IMPORT_MAX_BYTES) {
        return response.customError({
          statusCode: 413,
          body: {
            message: `The export is ${Math.ceil(bytes / 1024 / 1024)} MB; imports accept at most ${
              IMPORT_MAX_BYTES / 1024 / 1024
            } MB.`,
          },
        });
      }
      return response.ok({ body: payload });
    }
  );

  router.post(
    {
      path: `${ANNOTATIONS_API_PATH}/import`,
      security,
      options: { ...access, body: { maxBytes: IMPORT_MAX_BYTES } },
      validate: { body: importBodySchema },
    },
    async (_context, request, response) => {
      const { payload, skipped } = parseImport(request.body);
      try {
        const result = await (await client).importAll(payload);
        return response.ok({ body: { ...result, skipped: result.skipped + skipped } });
      } catch (error) {
        return rejectOrRethrow(response, error);
      }
    }
  );

  router.get(
    {
      path: `${ANNOTATIONS_API_PATH}/{id}/snapshot`,
      security,
      options: access,
      validate: { params: idParamsSchema },
    },
    async (_context, request, response) => {
      const snapshot = await (await client).getSnapshot(request.params.id);
      return snapshot ? response.ok({ body: snapshot }) : response.notFound();
    }
  );

  router.post(
    {
      path: ANNOTATIONS_API_PATH,
      security,
      options: access,
      validate: { body: newAnnotationSchema },
    },
    async (_context, request, response) => {
      try {
        return response.ok({ body: await (await client).create(request.body) });
      } catch (error) {
        return rejectOrRethrow(response, error);
      }
    }
  );

  router.patch(
    {
      path: `${ANNOTATIONS_API_PATH}/{id}`,
      security,
      options: access,
      validate: { params: idParamsSchema, body: annotationPatchSchema },
    },
    async (_context, request, response) => {
      try {
        const updated = await (await client).update(request.params.id, request.body);
        return updated ? response.ok({ body: updated }) : response.notFound();
      } catch (error) {
        return rejectOrRethrow(response, error);
      }
    }
  );
};
