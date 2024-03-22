/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';

export interface HasLibraryTransforms<StateT extends object = object> {
  canLinkToLibrary: () => Promise<boolean>;
  canUnlinkFromLibrary: () => Promise<boolean>;
  saveStateToSavedObject: (title: string) => Promise<{ state: StateT; savedObjectId: string; }>;
  savedObjectAttributesToState: () => StateT;
  checkForDuplicateTitle: (props: OnSaveProps) => Promise<void>;
}

export const apiHasLibraryTransforms = <StateT extends object = object>(unknownApi: null | unknown): unknownApi is HasLibraryTransforms<StateT> => {
  return Boolean(unknownApi &&
    typeof (unknownApi as HasLibraryTransforms<StateT>).canLinkToLibrary === 'function' &&
    typeof (unknownApi as HasLibraryTransforms<StateT>).canUnlinkFromLibrary === 'function' &&
    typeof (unknownApi as HasLibraryTransforms<StateT>).saveStateToSavedObject === 'function' &&
    typeof (unknownApi as HasLibraryTransforms<StateT>).savedObjectAttributesToState === 'function' &&
    typeof (unknownApi as HasLibraryTransforms<StateT>).checkForDuplicateTitle === 'function');
};

/**
 * @deprecated use HasLibraryTransforms instead
 */
export type HasLegacyLibraryTransforms = Pick<HasLibraryTransforms, 'canLinkToLibrary' | 'canUnlinkFromLibrary'> & {
  linkToLibrary: () => Promise<void>;
  unlinkFromLibrary: () => Promise<void>;
}

/**
 * @deprecated use apiHasLibraryTransforms instead
 */
export const apiHasLegacyLibraryTransforms = (unknownApi: null | unknown): unknownApi is HasLegacyLibraryTransforms => {
  return Boolean(unknownApi &&
    typeof (unknownApi as HasLegacyLibraryTransforms).canLinkToLibrary === 'function' &&
    typeof (unknownApi as HasLegacyLibraryTransforms).canUnlinkFromLibrary === 'function' &&
    typeof (unknownApi as HasLegacyLibraryTransforms).linkToLibrary === 'function' &&
    typeof (unknownApi as HasLegacyLibraryTransforms).unlinkFromLibrary === 'function');
};