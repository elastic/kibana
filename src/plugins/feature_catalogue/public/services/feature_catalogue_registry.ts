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

import { Capabilities } from 'src/core/public';
import { IconType } from '@elastic/eui';

/** @public */
export enum FeatureCatalogueCategory {
  ADMIN = 'admin',
  DATA = 'data',
  OTHER = 'other',
}

/** @public */
export interface FeatureCatalogueEntry {
  /** Unique string identifier for this feature. */
  readonly id: string;
  /** Title of feature displayed to the user. */
  readonly title: string;
  /** {@link FeatureCatalogueCategory} to display this feature in. */
  readonly category: FeatureCatalogueCategory;
  /** One-line description of feature displayed to the user. */
  readonly description: string;
  /** EUI `IconType` for icon to be displayed to the user. EUI supports any known EUI icon, SVG URL, or ReactElement. */
  readonly icon: IconType;
  /** URL path to link to this future. Should not include the basePath. */
  readonly path: string;
  /** Whether or not this link should be shown on the front page of Kibana. */
  readonly showOnHomePage: boolean;
}

export class FeatureCatalogueRegistry {
  private readonly features = new Map<string, FeatureCatalogueEntry>();

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
    };
  }

  public start({ capabilities }: { capabilities: Capabilities }) {
    return {
      get: (): readonly FeatureCatalogueEntry[] =>
        [...this.features.values()]
          .filter(entry => capabilities.catalogue[entry.id] !== false)
          .sort(compareByKey('title')),
    };
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
