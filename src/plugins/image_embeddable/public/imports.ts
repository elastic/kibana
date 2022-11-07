/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  FilesClient,
  FilesSetup,
  FilesStart,
  ScopedFilesClient,
} from '@kbn/files-plugin/public';

export type { FileImageMetadata } from '@kbn/files-plugin/common';

export type {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';
export type { ApplicationStart, OverlayStart } from '@kbn/core/public';
