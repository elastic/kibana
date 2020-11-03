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

import { SavedObjectReference, SavedObjectsFindOptionsReference } from 'kibana/public';
import { SavedObjectLoader } from '../../../../plugins/saved_objects/public';
import { findListItems } from './find_list_items';
import { createSavedVisClass, SavedVisServices } from './_saved_vis';
import { TypesStart } from '../vis_types';

export interface SavedVisServicesWithVisualizations extends SavedVisServices {
  visualizationTypes: TypesStart;
}
export type SavedVisualizationsLoader = ReturnType<typeof createSavedVisLoader>;

export interface FindListItemsOptions {
  size?: number;
  references?: SavedObjectsFindOptionsReference[];
}

export function createSavedVisLoader(services: SavedVisServicesWithVisualizations) {
  const { savedObjectsClient, visualizationTypes } = services;

  class SavedObjectLoaderVisualize extends SavedObjectLoader {
    mapHitSource = (
      source: Record<string, any>,
      id: string,
      references: SavedObjectReference[] = []
    ) => {
      const visTypes = visualizationTypes;
      source.id = id;
      source.references = references;
      source.url = this.urlFor(id);

      let typeName = source.typeName;
      if (source.visState) {
        try {
          typeName = JSON.parse(String(source.visState)).type;
        } catch (e) {
          /* missing typename handled below */
        }
      }

      if (!typeName || !visTypes.get(typeName)) {
        source.error = 'Unknown visualization type';
        return source;
      }

      source.type = visTypes.get(typeName);
      source.savedObjectType = 'visualization';
      source.icon = source.type.icon;
      source.image = source.type.image;
      source.typeTitle = source.type.title;
      source.editUrl = `/edit/${id}`;

      return source;
    };
    urlFor(id: string) {
      return `#/edit/${encodeURIComponent(id)}`;
    }
    // This behaves similarly to find, except it returns visualizations that are
    // defined as appExtensions and which may not conform to type: visualization
    findListItems(search: string = '', sizeOrOptions: number | FindListItemsOptions = 100) {
      const { size = 100, references = undefined } =
        typeof sizeOrOptions === 'number'
          ? {
              size: sizeOrOptions,
            }
          : sizeOrOptions;
      return findListItems({
        search,
        size,
        references,
        mapSavedObjectApiHits: this.mapSavedObjectApiHits.bind(this),
        savedObjectsClient,
        visTypes: visualizationTypes.getAliases(),
      });
    }
  }
  const SavedVis = createSavedVisClass(services);
  return new SavedObjectLoaderVisualize(SavedVis, savedObjectsClient) as SavedObjectLoader & {
    findListItems: (search: string, sizeOrOptions?: number | FindListItemsOptions) => any;
  };
}
