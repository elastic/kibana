/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableInput, SavedObjectEmbeddableInput } from '../embeddables';

export interface ResettableEmbeddable<
  ValTypeInput extends EmbeddableInput = EmbeddableInput,
  RefTypeInput extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
> {
  onReset: (lastSavedInput: Partial<EmbeddableInput | SavedObjectEmbeddableInput>) => void;
}

export function isResettableEmbeddable(incoming: unknown): incoming is ResettableEmbeddable {
  return !!(incoming as ResettableEmbeddable).onReset;
}
