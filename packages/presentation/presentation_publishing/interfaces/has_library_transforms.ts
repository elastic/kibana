/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublishingSubject } from '../publishing_subject';

interface DuplicateTitleCheck {
  checkForDuplicateTitle: (
    newTitle: string,
    isTitleDuplicateConfirmed: boolean,
    onTitleDuplicate: () => void
  ) => Promise<void>;
}
interface LibraryTransformGuards {
  /**
   *
   * @returns {Promise<boolean>}
   *   True when embeddable is by-value and can be converted to by-reference
   */
  canLinkToLibrary: () => Promise<boolean>;
  /**
   *
   * @returns {Promise<boolean>}
   *   True when embeddable is by-reference and can be converted to by-value
   */
  canUnlinkFromLibrary: () => Promise<boolean>;
}

/**
 * APIs that inherit this interface can be linked to and unlinked from the library in place without
 * re-initialization.
 */
export interface HasInPlaceLibraryTransforms<RuntimeState extends object = object>
  extends Partial<LibraryTransformGuards>,
    DuplicateTitleCheck {
  /**
   * The id of the library item that this embeddable is linked to.
   */
  libraryId$: PublishingSubject<string | undefined>;

  /**
   * Save embeddable to library
   *
   * @returns {Promise<string>} id of persisted library item
   */
  saveToLibrary: (title: string) => Promise<string>;

  /**
   * gets a snapshot of this embeddable's runtime state without any state that links it to a library item.
   */
  getByValueRuntimeSnapshot: () => RuntimeState;

  /**
   * Un-links this embeddable from the library. This method is optional, and only needed if the Embeddable
   * is not meant to be re-initialized as part of the unlink operation. If the embeddable needs to be re-initialized
   * after unlinking, the getByValueState method should be used instead.
   */
  unlinkFromLibrary: () => void;
}

export const apiHasInPlaceLibraryTransforms = (
  unknownApi: null | unknown
): unknownApi is HasInPlaceLibraryTransforms => {
  return Boolean(
    unknownApi &&
      Boolean((unknownApi as HasInPlaceLibraryTransforms)?.libraryId$) &&
      typeof (unknownApi as HasInPlaceLibraryTransforms).saveToLibrary === 'function' &&
      typeof (unknownApi as HasInPlaceLibraryTransforms).unlinkFromLibrary === 'function'
  );
};

/**
 * @deprecated use HasInPlaceLibraryTransforms instead
 * APIs that inherit this interface can be linked to and unlinked from the library. After the save or unlink
 * operation, the embeddable will be reinitialized.
 */
export interface HasLibraryTransforms<StateT extends object = object>
  extends LibraryTransformGuards,
    DuplicateTitleCheck {
  /**
   * Save embeddable to library
   *
   * @returns {Promise<string>} id of persisted library item
   */
  saveToLibrary: (title: string) => Promise<string>;
  /**
   *
   * @returns {StateT}
   * by-reference embeddable state replacing by-value embeddable state. After
   * the save operation, the embeddable will be reinitialized with the results of this method.
   */
  getByReferenceState: (libraryId: string) => StateT;
  /**
   *
   * @returns {StateT}
   * by-value embeddable state replacing by-reference embeddable state. After
   * the unlink operation, the embeddable will be reinitialized with the results of this method.
   */
  getByValueState: () => StateT;
}

export const apiHasLibraryTransforms = <StateT extends object = object>(
  unknownApi: null | unknown
): unknownApi is HasLibraryTransforms<StateT> => {
  return Boolean(
    unknownApi &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).canLinkToLibrary === 'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).canUnlinkFromLibrary === 'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).saveToLibrary === 'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).getByReferenceState === 'function' &&
      typeof (unknownApi as HasLibraryTransforms<StateT>).getByValueState === 'function' &&
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
