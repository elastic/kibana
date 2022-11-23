/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FileJSON, FileKind } from '.';
export interface FilesClient<M = unknown> {
  create: (
    args: Readonly<
      { name?: string; meta?: Readonly<{} & {}>; alt?: string; mimeType?: string } & {}
    > & { abortSignal?: AbortSignal } & { kind: string }
  ) => Promise<{ file: FileJSON<M> }>;
  delete: (
    args: Readonly<{ id?: string } & {}> & { abortSignal?: AbortSignal } & { kind: string }
  ) => Promise<{ ok: true }>;
  upload: (
    args: Readonly<{ id?: string } & {}> &
      Readonly<{ selfDestructOnAbort?: boolean } & {}> & {
        body: unknown;
        kind: string;
        abortSignal?: AbortSignal;
        contentType?: string;
      }
  ) => Promise<{
    ok: true;
    size: number;
  }>;
  download: (
    args: Readonly<{ fileName?: string; id?: string } & {}> & { abortSignal?: AbortSignal } & {
      kind: string;
    }
  ) => Promise<any>;
  getFileKind: (id: string) => FileKind;
}
