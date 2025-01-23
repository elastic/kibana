/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializedPanelState } from './has_serializable_state';

export interface HasSerializedStateComparator<SerializedState extends object = object> {
  /**
   * Compares two versions of the serialized state of this API and returns whether they are equal.
   */
  isSerializedStateEqual: (
    a?: SerializedPanelState<SerializedState>,
    b?: SerializedPanelState<SerializedState>
  ) => boolean;
}

export const apiHasSerializedStateComparator = <SerializedState extends object = object>(
  api: unknown | null
): api is HasSerializedStateComparator<SerializedState> => {
  return Boolean((api as HasSerializedStateComparator<SerializedState>)?.isSerializedStateEqual);
};
