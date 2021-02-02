/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EmbeddableInput } from '../types';

export interface SavedObjectEmbeddableInput extends EmbeddableInput {
  savedObjectId: string;
}

export function isSavedObjectEmbeddableInput(
  input: EmbeddableInput | SavedObjectEmbeddableInput
): input is SavedObjectEmbeddableInput {
  return Boolean((input as SavedObjectEmbeddableInput).savedObjectId);
}
