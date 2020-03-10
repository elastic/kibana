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
  SavedObjectKibanaServices,
} from '../../../../../../../plugins/saved_objects/public';
// @ts-ignore
import { updateOldState } from '../legacy/vis_update_state';
import { extractReferences, injectReferences } from './saved_visualization_references';
import {
  IIndexPattern,
  ISearchSource,
  SearchSource,
} from '../../../../../../../plugins/data/public';
import { SerializedVisWithData } from '../types';
import { VisImpl } from '../vis_impl';
import { createSavedSearchesLoader } from '../../../../../../../plugins/discover/public';
import { PersistedState } from '../../../../../../../plugins/visualizations/public';
import { getSavedObjects, getIndexPatterns, getOverlays, getChrome } from '../services';

export interface VisWithData {
  vis: VisImpl;
  searchSource: ISearchSource;
}

export const getVisSavedObject = ({ vis, searchSource }: VisWithData): SerializedVisWithData => {
  return {
    title: '',
    description: '',
    visState: vis.getCurrentState(),
    uiStateJSON: JSON.stringify(vis.getUiState().getChanges()),
    savedSearchId: searchSource.getParent() ? searchSource.getParent()!.getId() : undefined,
    searchSource,
  };
};

export const getVisPanel = async ({
  searchSource,
  savedSearchId,
  uiStateJSON,
  visState,
}: SerializedVisWithData): Promise<VisWithData> => {
  const linkedSearchSource = await getSearchSource(searchSource, savedSearchId);
  const uiState = new PersistedState(JSON.parse(uiStateJSON || '{}'));
  const vis = new VisImpl(linkedSearchSource!.getField('index')!, visState);
  vis._setUiState(uiState);

  return { searchSource: linkedSearchSource, vis };
};

const getSearchSource = async (inputSearchSource: ISearchSource, savedSearchId?: string) => {
  const searchSource = inputSearchSource.createCopy
    ? inputSearchSource.createCopy()
    : new SearchSource({ ...(inputSearchSource as any).fields });
  if (savedSearchId) {
    const savedSearch = await createSavedSearchesLoader({
      savedObjectsClient: getSavedObjects().client,
      indexPatterns: getIndexPatterns(),
      chrome: getChrome(),
      overlays: getOverlays(),
    }).get(savedSearchId);
    searchSource.setParent(savedSearch);
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
      });
      this.showInRecentlyAccessed = true;
      this.getFullPath = () => {
        return `/app/kibana#/visualize/edit/${this.id}`;
      };
    }
  }

  return SavedVis;
}
