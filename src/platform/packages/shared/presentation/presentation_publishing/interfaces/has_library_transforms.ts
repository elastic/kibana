/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SerializedPanelState } from './has_serializable_state';

/**
 * APIs that inherit this interface can be linked to and unlinked from the library.
 */
export interface HasLibraryTransforms<
  ByReferenceSerializedState extends object = object,
  ByValueSerializedState extends object = object
> {
  checkForDuplicateTitle: (
    newTitle: string,
    isTitleDuplicateConfirmed: boolean,
    onTitleDuplicate: () => void
  ) => Promise<void>;

  /**
   *
   * @returns {Promise<boolean>}
   * Returns true when this API is by-value and can be converted to by-reference
   */
  canLinkToLibrary: () => Promise<boolean>;

  /**
   *
   * @returns {Promise<boolean>}
   * Returns true when this API is by-reference and can be converted to by-value
   */
  canUnlinkFromLibrary: () => Promise<boolean>;

  /**
   * Save the state of this API to the library. This will return the ID of the persisted library item.
   *
   * @returns {Promise<string>} id of persisted library item
   */
  saveToLibrary: (title: string) => Promise<string>;

  /**
   *
   * @returns {ByReferenceSerializedState}
   * get by-reference serialized state from this API.
   */
  getSerializedStateByReference: (
    newId: string
  ) => SerializedPanelState<ByReferenceSerializedState>;

  /**
   *
   * @returns {ByValueSerializedState}
   * get by-value serialized state from this API
   */
  getSerializedStateByValue: () => SerializedPanelState<ByValueSerializedState>;
}

export const apiHasLibraryTransforms = <StateT extends object = object>(
  unknownApi: null | unknown
): unknownApi is HasLibraryTransforms<StateT> => {
  return Boolean(
    unknownApi &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).canLinkToLibrary === 'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).canUnlinkFromLibrary === 'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).saveToLibrary === 'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).getSerializedStateByReference ===
        'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).getSerializedStateByValue ===
        'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).checkForDuplicateTitle === 'function'
  );
};
