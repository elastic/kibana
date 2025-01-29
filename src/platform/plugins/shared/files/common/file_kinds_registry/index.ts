/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import assert from 'assert';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';
import type { FileKindBase } from '@kbn/shared-ux-file-types';
import type { FileKind } from '../types';

export interface FileKindsRegistry<FK extends FileKindBase = FileKind> {
  /**
   * Register a new file kind.
   */
  register(fileKind: FK): void;

  /**
   * Gets a {@link FileKind} or throws.
   */
  get(id: string): FK;

  /**
   * Return all registered {@link FileKind}s.
   */
  getAll(): FK[];
}

/**
 * @internal
 */
export class FileKindsRegistryImpl<FK extends FileKindBase = FileKind>
  implements FileKindsRegistry<FK>
{
  constructor(private readonly onRegister?: (fileKind: FK) => void) {}

  private readonly fileKinds = new Map<string, FK>();

  register(fileKind: FK) {
    if (this.fileKinds.get(fileKind.id)) {
      throw new Error(`File kind "${fileKind.id}" already registered.`);
    }

    if (fileKind.id !== encodeURIComponent(fileKind.id)) {
      throw new Error(
        `File kind id "${fileKind.id}" is not a valid file kind ID. Choose an ID that does not need to be URI encoded.`
      );
    }

    this.fileKinds.set(fileKind.id, fileKind);
    this.onRegister?.(fileKind);
  }

  get(id: string): FK {
    const fileKind = this.fileKinds.get(id);
    assert(fileKind, `File kind with id "${id}" not found.`);
    return fileKind;
  }

  getAll(): FK[] {
    return Array.from(this.fileKinds.values());
  }
}

export const [getFileKindsRegistry, setFileKindsRegistry] =
  createGetterSetter<FileKindsRegistry>('fileKindsRegistry');
