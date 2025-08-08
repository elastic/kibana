/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import {
  HasEditCapabilities,
  HasLibraryTransforms,
  PublishesUnsavedChanges,
} from '@kbn/presentation-publishing';
import type { BookState } from '../../../server';
import { BookEmbeddableState, BookByReferenceState } from '../../../common';

export type BookApi = DefaultEmbeddableApi<BookEmbeddableState> &
  HasEditCapabilities &
  HasLibraryTransforms<BookByReferenceState, BookState> &
  PublishesUnsavedChanges & {
    getSavedObjectId: () => string | undefined;
  };
