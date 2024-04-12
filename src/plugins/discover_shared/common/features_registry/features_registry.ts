/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { BaseFeature } from './types';

export class FeaturesRegistry<Feature extends BaseFeature = BaseFeature> {
  private readonly features = new Map<Feature['id'], Feature>();

  register(feature: Feature): void {
    if (this.features.has(feature.id)) {
      throw new Error(
        `FeaturesRegistry#register: feature with id "${feature.id}" already exists in the registry.`
      );
    }

    this.features.set(feature.id, feature);
  }

  getById<Id extends Feature['id']>(id: Id) {
    return this.features.get(id) as Extract<Feature, { id: Id }> | undefined;
  }
}
