/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { BaseFeature, FeaturesMap } from './types';

export class FeaturesRegistry<Feature extends BaseFeature = BaseFeature> {
  private readonly features = new BehaviorSubject<FeaturesMap<Feature>>(new Map());

  /**
   * Registers a new feature in the registry.
   * @param {Feature} feature The actual feature instance to register.
   * @throws {Error} If a feature with the same id already exists.
   */
  register(feature: Feature): void {
    const featuresMap = this.getFeaturesMap();

    if (featuresMap.has(feature.id)) {
      throw new Error(
        `FeaturesRegistry#register: feature with id "${feature.id}" already exists in the registry.`
      );
    }

    this.features.next(new Map([...featuresMap.entries(), [feature.id, feature]]));
  }

  /**
   * Retrieves a registered feature by its id.
   * @param id The identifier of the feature to retrieve.
   * @returns The feature if found, otherwise undefined.
   */
  getById<Id extends Feature['id']>(id: Id) {
    return this.getFeaturesMap().get(id) as Extract<Feature, { id: Id }> | undefined;
  }

  /**
   * Observes changes to the registry.
   * @returns An observable that emits a Map of all registered features whenever the registry changes.
   */
  public observe(): Observable<FeaturesMap<Feature>> {
    return this.features.asObservable();
  }

  /**
   * Subscribe for changes to the registry.
   * @returns A subscription for the registered callback on the emitted Map
   */
  subscribe(callback: (features: FeaturesMap<Feature>) => void): Subscription {
    return this.features.subscribe(callback);
  }

  /**
   * Retrieves all the registered features.
   * @returns A Map instance.
   */
  private getFeaturesMap() {
    return this.features.getValue();
  }
}
