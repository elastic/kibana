/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';
import assert from 'assert';
import { FileKind } from '..';

export interface FileKindsRegistry {
  /**
   * Register a new file kind.
   */
  register(fileKind: FileKind): void;

  /**
   * Gets a {@link FileKind} or throws.
   */
  get(id: string): FileKind;

  /**
   * Return all registered {@link FileKind}s.
   */
  getAll(): FileKind[];
}

/**
 * @internal
 */
export class FileKindsRegistryImpl implements FileKindsRegistry {
  constructor(private readonly onRegister?: (fileKind: FileKind) => void) {}

  private readonly fileKinds = new Map<string, FileKind>();

  register(fileKind: FileKind) {
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

  get(id: string): FileKind {
    const fileKind = this.fileKinds.get(id);
    assert(fileKind, `File kind with id "${id}" not found.`);
    return fileKind;
  }

  getAll(): FileKind[] {
    return Array.from(this.fileKinds.values());
  }
}

export const [getFileKindsRegistry, setFileKindsRegistry] =
  createGetterSetter<FileKindsRegistry>('fileKindsRegistry');
