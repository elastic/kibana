/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FileServiceStart } from '../file_service/file_service';
import type { FileRpcServiceHooks, FileRpcMethods } from './types';
import { normalizeErrors } from './util';

export class FileRpcService implements FileRpcMethods {
  constructor (
    private readonly service: FileServiceStart,
    private readonly hooks: FileRpcServiceHooks
  ) {}

  public readonly create: FileRpcMethods['create'] = normalizeErrors(async (req) => {
    const { ctx, data } = req;
    const { fileKind, name, alt, meta, mime } = data;
    const user = ctx.user ? { id: ctx.user.profile_uid, name: ctx.user.username } : undefined;

    const file = await this.service.create({
      fileKind,
      name,
      alt,
      meta,
      user,
      mime,
    });

    return {
      data: file.toJSON(),
      httpCode: 200,
    };
  });
}
