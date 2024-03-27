/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface HasLibraryTransforms<StateT extends object = object> {
  //
  // Add to library methods
  //
  /**
   *
   * @returns {Promise<boolean>}
   *   True when embeddable is by-value and can be converted to by-reference
   */
  canLinkToLibrary: () => Promise<boolean>;
  /**
   * Saves embeddable to library
   *
   * @returns {Promise<{ state: StateT; savedObjectId: string }>}
   *   state: by-reference embeddable state replacing by-value embeddable state
   *   savedObjectId: Saved object id for new saved object added to library
   */
  saveStateToSavedObject: (title: string) => Promise<{ state: StateT; savedObjectId: string }>;
  checkForDuplicateTitle: (
    newTitle: string,
    isTitleDuplicateConfirmed: boolean,
    onTitleDuplicate: () => void
  ) => Promise<void>;

  //
  // Unlink from library methods
  //
  /**
   *
   * @returns {Promise<boolean>}
   *   True when embeddable is by-reference and can be converted to by-value
   */
  canUnlinkFromLibrary: () => Promise<boolean>;
  /**
   *
   * @returns {StateT}
   *   by-value embeddable state replacing by-reference embeddable state
   */
  savedObjectAttributesToState: () => StateT;
}

export const apiHasLibraryTransforms = <StateT extends object = object>(
  unknownApi: null | unknown
): unknownApi is HasLibraryTransforms<StateT> => {
  return Boolean(
    unknownApi &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).canLinkToLibrary === 'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).canUnlinkFromLibrary === 'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).saveStateToSavedObject === 'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).savedObjectAttributesToState ===
        'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).checkForDuplicateTitle === 'function'
  );
};

/**
 * @deprecated use HasLibraryTransforms instead
 */
export type HasLegacyLibraryTransforms = Pick<
  HasLibraryTransforms,
  'canLinkToLibrary' | 'canUnlinkFromLibrary'
> & {
  linkToLibrary: () => Promise<void>;
  unlinkFromLibrary: () => Promise<void>;
};

/**
 * @deprecated use apiHasLibraryTransforms instead
 */
export const apiHasLegacyLibraryTransforms = (
  unknownApi: null | unknown
): unknownApi is HasLegacyLibraryTransforms => {
  return Boolean(
    unknownApi &&
      typeof (unknownApi as HasLegacyLibraryTransforms).canLinkToLibrary === 'function' &&
      typeof (unknownApi as HasLegacyLibraryTransforms).canUnlinkFromLibrary === 'function' &&
      typeof (unknownApi as HasLegacyLibraryTransforms).linkToLibrary === 'function' &&
      typeof (unknownApi as HasLegacyLibraryTransforms).unlinkFromLibrary === 'function'
  );
};
