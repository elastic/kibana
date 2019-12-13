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
import { npStart } from 'ui/new_platform';
// @ts-ignore
import { Vis } from 'ui/vis';
import { SearchSourceContract } from 'ui/courier';
import { createSavedObjectClass } from 'ui/saved_objects/saved_object';
import { updateOldState } from '../../../../visualizations/public';
import { VisualizeConstants } from '../visualize_constants';
import { extractReferences, injectReferences } from './saved_visualization_references';
import { IndexPattern } from '../../../../../../plugins/data/public';
import { SavedSearch } from '../../discover/types';

import { createSavedSearchesService } from '../../discover';

export function createSavedVisClass() {
  const savedObjectsClient = npStart.core.savedObjects.client;
  const services = {
    savedObjectsClient,
    indexPatterns: npStart.plugins.data.indexPatterns,
    chrome: npStart.core.chrome,
    overlays: npStart.core.overlays,
  };

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
    public savedSearchId?: string;
    public vis?: any;
    public visState?: any;
    public savedSearch?: SavedSearch;
    public searchSource?: SearchSourceContract;

    constructor(opts: Record<string, unknown> | string = {}) {
      if (typeof opts !== 'object') {
        opts = { id: opts };
      }
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
          visState: (function() {
            if (!opts.type) return null;
            return { type: opts.type };
          })(),
          uiStateJSON: '{}',
          description: '',
          savedSearchId: opts.savedSearchId,
          version: 1,
        },
      });
      this.showInRecentlyAccessed = true;
      this.getFullPath = () => {
        return `/app/kibana#${VisualizeConstants.EDIT_PATH}/${this.id}`;
      };
    }

    async _afterEsResp() {
      await this._getLinkedSavedSearch();
      this.searchSource!.setField('size', 0);
      return this.vis ? this._updateVis() : this._createVis();
    }

    async _getLinkedSavedSearch() {
      const linkedSearch = !!this.savedSearchId;
      const current = this.savedSearch;

      if (linkedSearch && current && current.id === this.savedSearchId) {
        return;
      }

      if (this.savedSearch) {
        this.searchSource!.setParent(this.savedSearch.searchSource.getParent());
        this.savedSearch.destroy();
        delete this.savedSearch;
      }
      const savedSearches = createSavedSearchesService(services);

      if (linkedSearch) {
        this.savedSearch = await savedSearches.get(this.savedSearchId!);
        this.searchSource!.setParent(this.savedSearch!.searchSource);
      }
    }

    async _createVis() {
      this.visState = updateOldState(this.visState);

      // visState doesn't yet exist when importing a visualization, so we can't
      // assume that exists at this point. If it does exist, then we're not
      // importing a visualization, so we want to sync the title.
      if (this.visState) {
        this.visState.title = this.title;
      }
      // the typescript compiler is wrong here, will be right when vis.js -> vis.ts
      // @ts-ignore
      this.vis = new Vis(this.searchSource!.getField('index'), this.visState);

      this.vis!.savedSearchId = this.savedSearchId;

      return this.vis;
    }

    _updateVis() {
      if (this.vis && this.searchSource) {
        this.vis.indexPattern = this.searchSource.getField('index');
        this.visState.title = this.title;
        this.vis.setState(this.visState);
        this.vis.savedSearchId = this.savedSearchId;
      }
    }
  }

  return SavedVis;
}
