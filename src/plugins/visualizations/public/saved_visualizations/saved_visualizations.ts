/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectReference, SavedObjectsFindOptionsReference } from 'kibana/public';
import { SavedObjectLoader } from '../../../../plugins/saved_objects/public';
import { findListItems } from './find_list_items';
import { createSavedVisClass, SavedVisServices } from './_saved_vis';
import type { TypesStart } from '../vis_types';

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
