/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ISavedObjectTypeRegistry,
  ISavedObjectsSpacesExtension,
} from '@kbn/core-saved-objects-server';
import { getIndexForType } from '@kbn/core-saved-objects-base-server-internal';
import { normalizeNamespace } from '../internal_utils';

export class CommonHelper {
  private registry: ISavedObjectTypeRegistry;
  private spaceExtension?: ISavedObjectsSpacesExtension;
  private defaultIndex: string;
  private kibanaVersion: string;

  constructor({
    registry,
    spaceExtension,
    kibanaVersion,
    defaultIndex,
  }: {
    registry: ISavedObjectTypeRegistry;
    spaceExtension?: ISavedObjectsSpacesExtension;
    defaultIndex: string;
    kibanaVersion: string;
  }) {
    this.registry = registry;
    this.spaceExtension = spaceExtension;
    this.kibanaVersion = kibanaVersion;
    this.defaultIndex = defaultIndex;
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
}

const unique = (array: string[]) => [...new Set(array)];
