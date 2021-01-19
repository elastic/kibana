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
import { SavedObject } from '../../../../core/types/saved_objects';

export type VisualizationStage = 'experimental' | 'beta' | 'production';

export interface VisualizationListItem {
  editUrl: string;
  editApp?: string;
  error?: string;
  icon: string;
  id: string;
  stage: VisualizationStage;
  savedObjectType: string;
  title: string;
  description?: string;
  getSupportedTriggers?: () => string[];
  typeTitle: string;
  image?: string;
}

export interface VisualizationsAppExtension {
  docTypes: string[];
  searchFields?: string[];
  toListItem: (savedObject: SavedObject) => VisualizationListItem;
}

export interface VisTypeAliasPromoTooltip {
  description: string;
  link: string;
}

export interface VisTypeAlias {
  aliasPath: string;
  aliasApp: string;
  name: string;
  title: string;
  icon: string;
  promotion?: boolean;
  promoTooltip?: VisTypeAliasPromoTooltip;
  description: string;
  note?: string;
  disabled?: boolean;
  getSupportedTriggers?: () => string[];
  stage: VisualizationStage;

  appExtensions?: {
    visualizations: VisualizationsAppExtension;
    [appName: string]: unknown;
  };
}

let registry: VisTypeAlias[] = [];
const discardOnRegister: string[] = [];

interface VisTypeAliasRegistry {
  get: () => VisTypeAlias[];
  add: (newVisTypeAlias: VisTypeAlias) => void;
  remove: (visTypeAliasName: string) => void;
}

export const visTypeAliasRegistry: VisTypeAliasRegistry = {
  get: () => [...registry],
  add: (newVisTypeAlias) => {
    if (registry.find((visTypeAlias) => visTypeAlias.name === newVisTypeAlias.name)) {
      throw new Error(`${newVisTypeAlias.name} already registered`);
    }
    // if it exists on discardOnRegister array then we don't allow it to be registered
    const isToBeDiscarded = discardOnRegister.some(
      (aliasName) => aliasName === newVisTypeAlias.name
    );
    if (!isToBeDiscarded) {
      registry.push(newVisTypeAlias);
    }
  },
  remove: (visTypeAliasName) => {
    const isAliasPresent = registry.find((visTypeAlias) => visTypeAlias.name === visTypeAliasName);
    // in case the alias has not registered yet we store it on an array, in order to not allow it to
    // be registered in case of a race condition
    if (!isAliasPresent) {
      discardOnRegister.push(visTypeAliasName);
    } else {
      registry = registry.filter((visTypeAlias) => visTypeAlias.name !== visTypeAliasName);
    }
  },
};
