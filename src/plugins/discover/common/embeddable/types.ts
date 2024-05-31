/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SerializedTitles } from '@kbn/presentation-publishing';
import type { SavedSearchByValueAttributes } from '@kbn/saved-search-plugin/public';

export type SearchEmbeddableSerializedState = SerializedTitles & {
  attributes?: SavedSearchByValueAttributes;
  // by reference
  savedObjectId?: string;
};

export type SearchEmbeddableRuntimeState = Omit<
  SavedSearchByValueAttributes,
  | 'title'
  | 'description'
  | 'kibanaSavedObjectMeta'
  | 'visContext'
  | 'timeRestore'
  | 'refreshInterval'
> &
  SerializedTitles & { savedObjectid?: string };
