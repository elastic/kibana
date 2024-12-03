/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSpacesExtension,
  ISavedObjectsEncryptionExtension,
} from '@kbn/core-saved-objects-server';
import { getIndexForType } from '@kbn/core-saved-objects-base-server-internal';
import { SavedObjectsUtils } from '@kbn/core-saved-objects-utils-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { normalizeNamespace } from '../utils';
import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';

export type ICommonHelper = PublicMethodsOf<CommonHelper>;

export class CommonHelper {
  private registry: ISavedObjectTypeRegistry;
  private spaceExtension?: ISavedObjectsSpacesExtension;
  private encryptionExtension?: ISavedObjectsEncryptionExtension;
  private defaultIndex: string;
  private kibanaVersion: string;

  public readonly createPointInTimeFinder: CreatePointInTimeFinderFn;

  constructor({
    registry,
    createPointInTimeFinder,
    spaceExtension,
    encryptionExtension,
    kibanaVersion,
    defaultIndex,
  }: {
    registry: ISavedObjectTypeRegistry;
    spaceExtension?: ISavedObjectsSpacesExtension;
    encryptionExtension?: ISavedObjectsEncryptionExtension;
    createPointInTimeFinder: CreatePointInTimeFinderFn;
    defaultIndex: string;
    kibanaVersion: string;
  }) {
    this.registry = registry;
    this.spaceExtension = spaceExtension;
    this.encryptionExtension = encryptionExtension;
    this.kibanaVersion = kibanaVersion;
    this.defaultIndex = defaultIndex;
    this.createPointInTimeFinder = createPointInTimeFinder;
  }

  /**
   * Returns index specified by the given type or the default index
   *
   * @param type - the type
   */
  public getIndexForType(type: string) {
    return getIndexForType({
      type,
      defaultIndex: this.defaultIndex,
      typeRegistry: this.registry,
      kibanaVersion: this.kibanaVersion,
    });
  }

  /**
   * Returns an array of indices as specified in `this._registry` for each of the
   * given `types`. If any of the types don't have an associated index, the
   * default index `this._index` will be included.
   *
   * @param types The types whose indices should be retrieved
   */
  public getIndicesForTypes(types: string[]) {
    return unique(types.map((t) => this.getIndexForType(t)));
  }

  /**
   * {@inheritDoc ISavedObjectsRepository.getCurrentNamespace}
   */
  public getCurrentNamespace(namespace?: string) {
    if (this.spaceExtension) {
      return this.spaceExtension.getCurrentNamespace(namespace);
    }
    return normalizeNamespace(namespace);
  }

  /**
   * Saved objects with encrypted attributes should have IDs that are hard to guess, especially since IDs are part of the AAD used during
   * encryption, that's why we control them within this function and don't allow consumers to specify their own IDs directly for encryptable
   * types unless overwriting the original document.
   */
  public getValidId(
    type: string,
    id: string | undefined,
    version: string | undefined,
    overwrite: boolean | undefined
  ) {
    if (!this.encryptionExtension?.isEncryptableType(type)) {
      return id || SavedObjectsUtils.generateId();
    }
    if (!id) {
      return SavedObjectsUtils.generateId();
    }

    const shouldEnforceRandomId = this.encryptionExtension?.shouldEnforceRandomId(type);

    // Allow specified ID if:
    // 1. we're overwriting an existing ESO with a Version (this helps us ensure that the document really was previously created using ESO)
    // 2. enforceRandomId is explicitly set to false
    const canSpecifyID =
      !shouldEnforceRandomId || (overwrite && version) || SavedObjectsUtils.isRandomId(id);
    if (!canSpecifyID) {
      throw SavedObjectsErrorHelpers.createBadRequestError(
        'Predefined IDs are not allowed for saved objects with encrypted attributes unless the ID is a UUID.'
      );
    }
    return id;
  }
}

const unique = (array: string[]) => [...new Set(array)];
