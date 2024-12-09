/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandler, RouteMethod, RouteRegistrar } from '@kbn/core/server';

import { FilesRouter } from '../types';
import { FileKindRouter, FileKindsRequestHandlerContext } from './types';

interface Args {
  router: FilesRouter;
  fileKind: string;
}

type FileKindHandler = RequestHandler<unknown, unknown, unknown, FileKindsRequestHandlerContext>;

/**
 * Wraps {@link FilesRouter}, adding a middle man for injecting file-kind into
 * route handler context
 */
export function enhanceRouter({ router, fileKind }: Args): FileKindRouter {
  const handlerWrapper: (handler: FileKindHandler) => FileKindHandler =
    (handler) => async (ctx, req, res) => {
      return handler(
        Object.create(ctx, { fileKind: { value: fileKind, enumerable: true, writable: false } }),
        req,
        res
      );
    };

  return new Proxy<FileKindRouter>(router as FileKindRouter, {
    get(target, prop, receiver) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(prop as string)) {
        const manInTheMiddleRegistrar: RouteRegistrar<
          RouteMethod,
          FileKindsRequestHandlerContext
        > = (opts, handler): void => {
          return Reflect.apply(target[prop as keyof FileKindRouter] as Function, target, [
            opts,
            handlerWrapper(handler as FileKindHandler),
          ]);
        };
        return manInTheMiddleRegistrar;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
