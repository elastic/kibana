/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EmbeddableInput, SavedObjectEmbeddableInput } from '..';

/**
 * Any embeddable that implements this interface will be able to use input that is
 * either by reference (backed by a saved object) OR by value, (provided
 * by the container).
 * @public
 */
export interface ReferenceOrValueEmbeddable<
  ValTypeInput extends EmbeddableInput = EmbeddableInput,
  RefTypeInput extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
> {
  /**
   * determines whether the input is by value or by reference.
   */
  inputIsRefType: (input: ValTypeInput | RefTypeInput) => input is RefTypeInput;

  /**
   * Gets the embeddable's current input as its Value type
   */
  getInputAsValueType: () => Promise<ValTypeInput>;

  /**
   * Gets the embeddable's current input as its Reference type
   */
  getInputAsRefType: () => Promise<RefTypeInput>;
}

export function isReferenceOrValueEmbeddable(
  incoming: unknown
): incoming is ReferenceOrValueEmbeddable {
  return (
    !!(incoming as ReferenceOrValueEmbeddable).inputIsRefType &&
    !!(incoming as ReferenceOrValueEmbeddable).getInputAsValueType &&
    !!(incoming as ReferenceOrValueEmbeddable).getInputAsRefType
  );
}
