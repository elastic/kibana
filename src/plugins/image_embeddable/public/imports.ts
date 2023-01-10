/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FileKind } from '@kbn/shared-ux-file-types';
import { defaultImageFileKind } from '@kbn/files-plugin/common';

export type {
  FilesClient,
  FilesSetup,
  FilesStart,
  ScopedFilesClient,
} from '@kbn/files-plugin/public';

export type { FileImageMetadata } from '@kbn/shared-ux-file-types';

export type {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';
export type { ApplicationStart, OverlayStart, ThemeServiceStart } from '@kbn/core/public';

export type { UiActionsStart, UiActionsSetup } from '@kbn/ui-actions-plugin/public';

export const imageEmbeddableFileKind: FileKind = defaultImageFileKind;
