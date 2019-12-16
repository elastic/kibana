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
// @ts-ignore
import { Vis } from 'ui/vis';
import { SavedObject, SavedObjectKibanaServices } from 'ui/saved_objects/types';
import { createSavedObjectClass } from 'ui/saved_objects/saved_object';
import { updateOldState } from '../../../../visualizations/public';
import { VisualizeConstants } from '../visualize_constants';
import { extractReferences, injectReferences } from './saved_visualization_references';
import { IndexPattern } from '../../../../../../plugins/data/public';
import { VisSavedObject } from '../legacy_imports';

import { createSavedSearchesService } from '../../discover';

async function _afterEsResp(savedVis: VisSavedObject, services: any) {
  await _getLinkedSavedSearch(savedVis, services);
  savedVis.searchSource!.setField('size', 0);
  savedVis.vis = savedVis.vis ? _updateVis(savedVis) : await _createVis(savedVis);
  return savedVis;
}

async function _getLinkedSavedSearch(savedVis: VisSavedObject, services: any) {
  const linkedSearch = !!savedVis.savedSearchId;
  const current = savedVis.savedSearch;

  if (linkedSearch && current && current.id === savedVis.savedSearchId) {
    return;
  }

  if (savedVis.savedSearch) {
    savedVis.searchSource!.setParent(savedVis.savedSearch.searchSource.getParent());
    savedVis.savedSearch.destroy();
    delete savedVis.savedSearch;
  }
  const savedSearches = createSavedSearchesService(services);

  if (linkedSearch) {
    savedVis.savedSearch = await savedSearches.get(savedVis.savedSearchId!);
    savedVis.searchSource!.setParent(savedVis.savedSearch!.searchSource);
  }
}

async function _createVis(savedVis: VisSavedObject) {
  savedVis.visState = updateOldState(savedVis.visState);

  // visState doesn't yet exist when importing a visualization, so we can't
  // assume that exists at this point. If it does exist, then we're not
  // importing a visualization, so we want to sync the title.
  if (savedVis.visState) {
    savedVis.visState.title = savedVis.title;
  }
  // the typescript compiler is wrong here, will be right when vis.js -> vis.ts
  // @ts-ignore
  savedVis.vis = new Vis(savedVis.searchSource!.getField('index'), savedVis.visState);

  savedVis.vis!.savedSearchId = savedVis.savedSearchId;

  return savedVis.vis;
}

function _updateVis(savedVis: VisSavedObject) {
  if (savedVis.vis && savedVis.searchSource) {
    savedVis.vis.indexPattern = savedVis.searchSource.getField('index');
    savedVis.visState.title = savedVis.title;
    savedVis.vis.setState(savedVis.visState);
    savedVis.vis.savedSearchId = savedVis.savedSearchId;
  }
  return savedVis.vis;
}

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
    /**
    public savedSearchId?: string;
    public vis?: any;
    public visState?: any;
    public savedSearch?: SavedSearch;
    public searchSource?: SearchSourceContract;
     **/

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
        indexPattern: opts.indexPattern as IndexPattern,
        defaults: {
          title: '',
          visState,
          uiStateJSON: '{}',
          description: '',
          savedSearchId: opts.savedSearchId,
          version: 1,
        },
        // @ts-ignore
        afterESResp: (savedObject: SavedObject) =>
          _afterEsResp(savedObject as VisSavedObject, services),
      });
      this.showInRecentlyAccessed = true;
      this.getFullPath = () => {
        return `/app/kibana#${VisualizeConstants.EDIT_PATH}/${this.id}`;
      };
    }
  }

  return SavedVis;
}
