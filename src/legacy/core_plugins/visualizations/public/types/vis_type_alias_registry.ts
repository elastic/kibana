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

export interface VisualizationListItem {
  editUrl: string;
  icon: string;
  id: string;
  isExperimental: boolean;
  savedObjectType: string;
  title: string;
  typeTitle: string;
}

export interface VisualizationsAppExtension {
  docTypes: string[];
  searchFields?: string[];
  toListItem: (savedObject: {
    id: string;
    type: string;
    attributes: object;
  }) => VisualizationListItem;
}

export interface VisTypeAlias {
  aliasUrl: string;
  name: string;
  title: string;
  icon: string;
  description: string;

  appExtensions?: {
    visualizations: VisualizationsAppExtension;
    [appName: string]: unknown;
  };
}

const registry: VisTypeAlias[] = [];

export const visTypeAliasRegistry = {
  get: () => [...registry],
  add: (newVisTypeAlias: VisTypeAlias) => {
    if (registry.find(visTypeAlias => visTypeAlias.name === newVisTypeAlias.name)) {
      throw new Error(`${newVisTypeAlias.name} already registered`);
    }
    registry.push(newVisTypeAlias);
  },
};
