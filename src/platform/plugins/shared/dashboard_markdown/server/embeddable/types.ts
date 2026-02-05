/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';
import type { MarkdownByReferenceState, MarkdownByValueState } from '..';
import type { MarkdownSavedObjectAttributes } from '../markdown_saved_object';

type StoredMarkdownByReferenceState = Omit<MarkdownByReferenceState, 'savedObjectId'> &
  SerializedTitles;

type StoredMarkdownByValueState = Omit<MarkdownByValueState, 'attributes'> & {
  attributes: MarkdownSavedObjectAttributes;
} & SerializedTitles;

export type StoredMarkdownEmbeddableState =
  | StoredMarkdownByReferenceState
  | StoredMarkdownByValueState;
