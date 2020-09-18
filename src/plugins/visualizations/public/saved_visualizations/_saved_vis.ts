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

/**
 * @name SavedVis
 *
 * @extends SavedObject.
 *
 * NOTE: It's a type of SavedObject, but specific to visualizations.
 */
import {
  createSavedObjectClass,
  SavedObject,
  SavedObjectKibanaServices,
} from '../../../../plugins/saved_objects/public';
// @ts-ignore
import { updateOldState } from '../legacy/vis_update_state';
import { extractReferences, injectReferences } from './saved_visualization_references';
import { IIndexPattern } from '../../../../plugins/data/public';
import { ISavedVis, SerializedVis } from '../types';
import { createSavedSearchesLoader } from '../../../discover/public';

export const convertToSerializedVis = (savedVis: ISavedVis): SerializedVis => {
  const { id, title, description, visState, uiStateJSON, searchSourceFields } = savedVis;

  const aggs = searchSourceFields && searchSourceFields.index ? visState.aggs || [] : visState.aggs;

  return {
    id,
    title,
    type: visState.type,
    description,
    params: visState.params,
    uiState: JSON.parse(uiStateJSON || '{}'),
    data: {
      aggs,
      searchSource: searchSourceFields!,
      savedSearchId: savedVis.savedSearchId,
    },
  };
};

export const convertFromSerializedVis = (vis: SerializedVis): ISavedVis => {
  return {
    id: vis.id,
    title: vis.title,
    description: vis.description,
    visState: {
      title: vis.title,
      type: vis.type,
      aggs: vis.data.aggs,
      params: vis.params,
    },
    uiStateJSON: JSON.stringify(vis.uiState),
    searchSourceFields: vis.data.searchSource,
    savedSearchId: vis.data.savedSearchId,
  };
};

export function createSavedVisClass(services: SavedObjectKibanaServices) {
  const SavedObjectClass = createSavedObjectClass(services);
  const savedSearch = createSavedSearchesLoader(services);

  class SavedVis extends SavedObjectClass {
    public static type: string = 'visualization';
    public static mapping: Record<string, string> = {
      title: 'text',
      visState: 'json',
      uiStateJSON: 'text',
      description: 'text',
      savedSearchId: 'keyword',
      version: 'integer',
    };
    // Order these fields to the top, the rest are alphabetical
    public static fieldOrder = ['title', 'description'];

    constructor(opts: Record<string, unknown> | string = {}) {
      if (typeof opts !== 'object') {
        opts = { id: opts };
      }
      const visState = !opts.type ? null : { type: opts.type };
      // Gives our SavedWorkspace the properties of a SavedObject
      super({
        type: SavedVis.type,
        mapping: SavedVis.mapping,
        extractReferences,
        injectReferences,
        id: (opts.id as string) || '',
        indexPattern: opts.indexPattern as IIndexPattern,
        defaults: {
          title: '',
          visState,
          uiStateJSON: '{}',
          description: '',
          savedSearchId: opts.savedSearchId,
          version: 1,
        },
        afterESResp: async (savedObject: SavedObject) => {
          const savedVis = (savedObject as any) as ISavedVis;
          savedVis.visState = await updateOldState(savedVis.visState);
          if (savedVis.searchSourceFields?.index) {
            await services.indexPatterns.get(savedVis.searchSourceFields.index as any);
          }
          if (savedVis.savedSearchId) {
            await savedSearch.get(savedVis.savedSearchId);
          }
          return (savedVis as any) as SavedObject;
        },
      });
      this.showInRecentlyAccessed = true;
      this.getFullPath = () => {
        return `/app/visualize#/edit/${this.id}`;
      };
    }
  }

  return SavedVis as new (opts: Record<string, unknown> | string) => SavedObject;
}
