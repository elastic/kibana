/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from '@kbn/core/public';
import { IconType } from '@elastic/eui';
import { BehaviorSubject, map, Observable } from 'rxjs';

/** @public */
export type FeatureCatalogueCategory = 'admin' | 'data' | 'other';

/** @public */
export interface FeatureCatalogueEntry {
  /** Unique string identifier for this feature. */
  readonly id: string;
  /** Title of feature displayed to the user. */
  readonly title: string;
  /** {@link FeatureCatalogueCategory} to display this feature in. */
  readonly category: FeatureCatalogueCategory;
  /** A tagline of feature displayed to the user. */
  readonly subtitle?: string;
  /** One-line description of feature displayed to the user. */
  readonly description: string;
  /** EUI `IconType` for icon to be displayed to the user. EUI supports any known EUI icon, SVG URL, or ReactElement. */
  readonly icon: IconType;
  /** URL path to link to this future. Should not include the basePath. */
  readonly path: string;
  /** Whether or not this link should be shown on the front page of Kibana. */
  readonly showOnHomePage: boolean;
  /** An ordinal used to sort features relative to one another for display on the home page */
  readonly order?: number;
  /** Optional function to control visibility of this feature. */
  readonly visible?: () => boolean;
  /** Unique string identifier of the solution this feature belongs to */
  readonly solutionId?: string;
}

/** @public */
export interface FeatureCatalogueSolution {
  /** Unique string identifier for this solution. */
  readonly id: string;
  /** Title of solution displayed to the user. */
  readonly title: string;
  /** One-line description of the solution displayed to the user. */
  readonly description: string;
  /** EUI `IconType` for icon to be displayed to the user. EUI supports any known EUI icon, SVG URL, or ReactElement. */
  readonly icon: IconType;
  /** URL path to link to this future. Should not include the basePath. */
  readonly path: string;
  /** An ordinal used to sort solutions relative to one another for display on the home page */
  readonly order: number;
  /** Optional function to control visibility of this solution. */
  readonly isVisible?: (capabilities: Capabilities) => boolean;
}

export class FeatureCatalogueRegistry {
  private capabilities: Capabilities | null = null;
  private solutions = new Map<string, FeatureCatalogueSolution>();
  private featuresSubject = new BehaviorSubject<Map<string, FeatureCatalogueEntry>>(new Map());

  public setup() {
    return {
      register: (feature: FeatureCatalogueEntry) => {
        const { value: features } = this.featuresSubject;
        if (features.has(feature.id)) {
          throw new Error(
            `Feature with id [${feature.id}] has already been registered. Use a unique id.`
          );
        }

        features.set(feature.id, feature);
        this.featuresSubject.next(new Map(features));
      },
      registerSolution: (solution: FeatureCatalogueSolution) => {
        if (this.solutions.has(solution.id)) {
          throw new Error(
            `Solution with id [${solution.id}] has already been registered. Use a unique id.`
          );
        }

        this.solutions.set(solution.id, solution);
      },
    };
  }

  public start({ capabilities }: { capabilities: Capabilities }) {
    this.capabilities = capabilities;
  }

  /**
   * @deprecated
   * Use getFeatures$() instead
   */
  public get(features = this.featuresSubject.value): FeatureCatalogueEntry[] {
    if (this.capabilities === null) {
      throw new Error('Catalogue entries are only available after start phase');
    }
    const capabilities = this.capabilities;
    return [...features.values()]
      .filter(
        (entry) =>
          capabilities.catalogue[entry.id] !== false && (entry.visible ? entry.visible() : true)
      )
      .sort(compareByKey('title'));
  }

  public getFeatures$(): Observable<FeatureCatalogueEntry[]> {
    return this.featuresSubject.pipe(map((feats) => this.get(feats)));
  }

  public getSolutions(): FeatureCatalogueSolution[] {
    if (this.capabilities === null) {
      throw new Error('Catalogue entries are only available after start phase');
    }
    const capabilities = this.capabilities;
    return [...this.solutions.values()]
      .filter(
        (solution) =>
          solution.isVisible?.(capabilities) ?? capabilities.catalogue[solution.id] !== false
      )
      .sort(compareByKey('title'));
  }

  public removeFeature(appId: string) {
    const { value: features } = this.featuresSubject;
    features.delete(appId);
    this.featuresSubject.next(new Map(features));
  }
}

export type FeatureCatalogueRegistrySetup = ReturnType<FeatureCatalogueRegistry['setup']>;

const compareByKey =
  <T>(key: keyof T) =>
  (left: T, right: T) => {
    if (left[key] < right[key]) {
      return -1;
    } else if (left[key] > right[key]) {
      return 1;
    } else {
      return 0;
    }
  };
