/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FileServiceStart } from '../file_service/file_service';
import type { FileRpcServiceHooks, FileRpcMethods } from './types';
import type { CreateFileArgs } from '../file_service/file_action_types';
import type { FileKindsRegistry } from '../../common/file_kinds_registry';
import { normalizeErrors } from './util';
import { FileRpcErrorGeneral, FileRpcErrorHookFailed } from './errors';

/**
 * An implementation of {@link FileRpcMethods} that uses the
 * {@link FileServiceStart}. It also allows to execute hooks in between the
 * service calls.
 */
export class FileRpcService implements FileRpcMethods {
  constructor (
    private readonly service: FileServiceStart,
    private readonly fileKindRegistry: FileKindsRegistry,
  ) {}

  public readonly create: FileRpcMethods['create'] = normalizeErrors(async (req) => {
    await this.executeHook(req.data.fileKind, 'onCreateStart', req);

    const { ctx, data } = req;
    const { fileKind, name, alt, meta, mime } = data;
    const user = ctx.user ? { id: ctx.user.profile_uid, name: ctx.user.username } : undefined;
    const args: CreateFileArgs = {
      fileKind,
      name,
      alt,
      meta,
      user,
      mime,
    };

    await this.executeHook(req.data.fileKind, 'onBeforeCreate', args);

    const file = await this.service.create(args);

    return {
      data: {
        file: file.toJSON(),
      },
      httpCode: 200,
    };
  });

  private hooks(fileKind: string): Partial<FileRpcServiceHooks> {
    const kind = this.fileKindRegistry.get(fileKind);
    if (!kind) return {};

    return kind.hooks ?? {};
  }

  private async executeHook<K extends keyof FileRpcServiceHooks>(fileKind: string, hookName: K, ...args: Parameters<FileRpcServiceHooks[K]>) {
    const hook = this.hooks(fileKind)[hookName];
    if (!hook) return;

    try {
      const result = await (hook as unknown as (...params: typeof args) => boolean)(...args);

      if (result !== true) {
        throw new FileRpcErrorHookFailed(hookName);
      }
    } catch (error) {
      if (error instanceof FileRpcErrorGeneral) {
        throw error;
      }

      throw new FileRpcErrorHookFailed(hookName);
    }
  }
}
