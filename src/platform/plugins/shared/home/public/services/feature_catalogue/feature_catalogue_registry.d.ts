/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core/public';
import type { IconType } from '@elastic/eui';
import type { Observable } from 'rxjs';
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
export declare class FeatureCatalogueRegistry {
  private capabilities;
  private solutions;
  private featuresSubject;
  setup(): {
    register: (feature: FeatureCatalogueEntry) => void;
    registerSolution: (solution: FeatureCatalogueSolution) => void;
  };
  start({ capabilities }: { capabilities: Capabilities }): void;
  /**
   * @deprecated
   * Use getFeatures$() instead
   */
  get(features?: Map<string, FeatureCatalogueEntry>): FeatureCatalogueEntry[];
  getFeatures$(): Observable<FeatureCatalogueEntry[]>;
  getSolutions(): FeatureCatalogueSolution[];
  removeFeature(appId: string): void;
}
export type FeatureCatalogueRegistrySetup = ReturnType<FeatureCatalogueRegistry['setup']>;
