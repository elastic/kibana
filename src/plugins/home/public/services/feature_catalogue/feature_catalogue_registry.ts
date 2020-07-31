/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Capabilities, AppCategory } from 'src/core/public';
import { IconType } from '@elastic/eui';

/** @public */
export enum FeatureCatalogueCategory {
  ADMIN = 'admin',
  DATA = 'data',
  OTHER = 'other',
}

/** @public */
export enum FeatureCatalogueHomePageSection {
  ADD_DATA = 'add_data',
  MANAGE_DATA = 'manage_data',
  SOLUTION_PANEL = 'solution_panel',
}

/** @public */
export interface FeatureCatalogueEntry {
  /** Unique string identifier for this feature. */
  readonly id: string;
  /** Title of feature displayed to the user. */
  readonly title: string;
  /** The solution to display this feature in. */
  readonly category: FeatureCatalogueCategory;
  /** One-line description of feature displayed to the user. */
  readonly description: string;
  /** EUI `IconType` for icon to be displayed to the user. EUI supports any known EUI icon, SVG URL, or ReactElement. */
  readonly icon: IconType;
  /** URL path to link to this future. Should not include the basePath. */
  readonly path: string;
  /** Indicate which home section this card should appear*/
  homePageSection?: FeatureCatalogueHomePageSection;
  /** An ordinal used to sort features relative to one another for display on the home page */
  readonly order?: number;
  /** The id of a registered solution this app should be displayed under in the solution section of the home page*/
  readonly solution?: string;
}

/** @public */
export interface FeatureCatalogueSolution {
  /** Unique string identifier for this feature. */
  readonly id: string;
  /** Title of feature displayed to the user. */
  readonly title: string;
  /** One-line description of feature displayed to the user. */
  readonly description: string;
  /** EUI `IconType` for icon to be displayed to the user. EUI supports any known EUI icon, SVG URL, or ReactElement. */
  readonly icon: IconType;
  /** URL path to link to this future. Should not include the basePath. */
  readonly path: string;
  /** An ordinal used to sort features relative to one another for display on the home page */
  readonly order?: number;
  /** The class to be applied to the solution card. */
  readonly className?: string;
}

export class FeatureCatalogueRegistry {
  private capabilities: Capabilities | null = null;
  private readonly features = new Map<string, FeatureCatalogueEntry>();
  private readonly solutions = new Map<string, FeatureCatalogueSolution>();

  public setup() {
    return {
      register: (feature: FeatureCatalogueEntry) => {
        if (this.features.has(feature.id)) {
          throw new Error(
            `Feature with id [${feature.id}] has already been registered. Use a unique id.`
          );
        }

        this.features.set(feature.id, feature);
      },
      registerSolution: (solution: FeatureCatalogueSolution) => {
        if (this.features.has(solution.id)) {
          throw new Error(
            `Feature with id [${solution.id}] has already been registered. Use a unique id.`
          );
        }

        this.solutions.set(solution.id, solution);
      },
    };
  }

  public start({ capabilities }: { capabilities: Capabilities }) {
    this.capabilities = capabilities;

    return {
      showOnHomePage: (featureId: string, section: FeatureCatalogueHomePageSection) => {
        const feature = this.features.get(featureId);
        if (feature) {
          feature.homePageSection = section;
          this.features.set(featureId, feature);
        }
      },
      hideFromHomePage: (featureId: string) => {
        const feature = this.features.get(featureId);
        if (feature) {
          feature.homePageSection = undefined;
          this.features.set(featureId, feature);
        }
      },
    };
  }

  public get(): readonly FeatureCatalogueEntry[] {
    if (this.capabilities === null) {
      throw new Error('Catalogue entries are only available after start phase');
    }
    const capabilities = this.capabilities;
    return [...this.features.values()]
      .filter((entry) => capabilities.catalogue[entry.id] !== false)
      .sort(compareByKey('title'));
  }

  public getSolutions(): readonly FeatureCatalogueSolution[] {
    if (this.capabilities === null) {
      throw new Error('Catalogue entries are only available after start phase');
    }
    const capabilities = this.capabilities;
    return [...this.solutions.values()]
      .filter((solution) => capabilities.catalogue[solution.id] !== false)
      .sort(compareByKey('title'));
  }
}

export type FeatureCatalogueRegistrySetup = ReturnType<FeatureCatalogueRegistry['setup']>;
export type FeatureCatalogueRegistryStart = ReturnType<FeatureCatalogueRegistry['start']>;

const compareByKey = <T>(key: keyof T) => (left: T, right: T) => {
  if (left[key] < right[key]) {
    return -1;
  } else if (left[key] > right[key]) {
    return 1;
  } else {
    return 0;
  }
};
