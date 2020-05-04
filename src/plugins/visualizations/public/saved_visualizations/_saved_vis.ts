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
import { IIndexPattern, ISearchSource } from '../../../../plugins/data/public';
import { ISavedVis, SerializedVis } from '../types';
import { createSavedSearchesLoader } from '../../../../plugins/discover/public';
import { getChrome, getOverlays, getIndexPatterns, getSavedObjects, getSearch } from '../services';

export const convertToSerializedVis = async (savedVis: ISavedVis): Promise<SerializedVis> => {
  const { visState } = savedVis;
  const searchSource =
    savedVis.searchSource && (await getSearchSource(savedVis.searchSource, savedVis.savedSearchId));

  const indexPattern =
    searchSource && searchSource.getField('index') ? searchSource.getField('index')!.id : undefined;

  const aggs = indexPattern ? visState.aggs || [] : visState.aggs;

  return {
    id: savedVis.id,
    title: savedVis.title,
    type: visState.type,
    description: savedVis.description,
    params: visState.params,
    uiState: JSON.parse(savedVis.uiStateJSON || '{}'),
    data: {
      indexPattern,
      aggs,
      searchSource,
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
      type: vis.type,
      aggs: vis.data.aggs,
      params: vis.params,
    },
    uiStateJSON: JSON.stringify(vis.uiState),
    searchSource: vis.data.searchSource!,
    savedSearchId: vis.data.savedSearchId,
  };
};

const getSearchSource = async (inputSearchSource: ISearchSource, savedSearchId?: string) => {
  const search = getSearch();

  const searchSource = inputSearchSource.createCopy
    ? inputSearchSource.createCopy()
    : search.searchSource.create({ ...(inputSearchSource as any).fields });

  if (savedSearchId) {
    const savedSearch = await createSavedSearchesLoader({
      search,
      savedObjectsClient: getSavedObjects().client,
      indexPatterns: getIndexPatterns(),
      chrome: getChrome(),
      overlays: getOverlays(),
    }).get(savedSearchId);

    searchSource.setParent(savedSearch.searchSource);
  }

  searchSource!.setField('size', 0);
  return searchSource;
};

export function createSavedVisClass(services: SavedObjectKibanaServices) {
  const SavedObjectClass = createSavedObjectClass(services);

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
    public static searchSource = true;

    constructor(opts: Record<string, unknown> | string = {}) {
      if (typeof opts !== 'object') {
        opts = { id: opts };
      }
      const visState = !opts.type ? null : { type: opts.type };
      // Gives our SavedWorkspace the properties of a SavedObject
      super({
        type: SavedVis.type,
        mapping: SavedVis.mapping,
        searchSource: SavedVis.searchSource,
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
          if (savedVis.savedSearchId && savedVis.searchSource) {
            savedObject.searchSource = await getSearchSource(
              savedVis.searchSource,
              savedVis.savedSearchId
            );
          }
          return (savedVis as any) as SavedObject;
        },
      });
      this.showInRecentlyAccessed = true;
      this.getFullPath = () => {
        return `/app/kibana#/visualize/edit/${this.id}`;
      };
    }
  }

  return SavedVis as new (opts: Record<string, unknown> | string) => SavedObject;
}
