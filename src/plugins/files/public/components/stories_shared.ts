/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FileKind } from '../../common';
import {
  setFileKindsRegistry,
  getFileKindsRegistry,
  FileKindsRegistryImpl,
} from '../../common/file_kinds_registry';

setFileKindsRegistry(new FileKindsRegistryImpl());
const fileKindsRegistry = getFileKindsRegistry();
export const register: FileKindsRegistryImpl['register'] = (fileKind: FileKind) => {
  if (!fileKindsRegistry.getAll().find((kind) => kind.id === fileKind.id)) {
    getFileKindsRegistry().register(fileKind);
  }
};
