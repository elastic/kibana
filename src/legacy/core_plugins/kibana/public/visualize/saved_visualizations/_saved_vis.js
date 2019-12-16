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

import { Vis } from 'ui/vis';
import { uiModules } from 'ui/modules';
import { updateOldState } from '../../../../visualizations/public';
import { VisualizeConstants } from '../np_ready/visualize_constants';
import { createLegacyClass } from 'ui/utils/legacy_class';
import { SavedObjectProvider } from 'ui/saved_objects/saved_object';
import { extractReferences, injectReferences } from './saved_visualization_references';

uiModules.get('app/visualize').factory('SavedVis', function(savedSearches, Private) {
  const SavedObject = Private(SavedObjectProvider);
  createLegacyClass(SavedVis).inherits(SavedObject);
  function SavedVis(opts) {
    const self = this;
    opts = opts || {};
    if (typeof opts !== 'object') opts = { id: opts };

    SavedVis.Super.call(self, {
      type: SavedVis.type,
      mapping: SavedVis.mapping,
      searchSource: SavedVis.searchSource,
      extractReferences: extractReferences,
      injectReferences: injectReferences,

      id: opts.id,
      indexPattern: opts.indexPattern,
      defaults: {
        title: '',
        visState: (function() {
          if (!opts.type) return null;
          const def = {};
          def.type = opts.type;
          return def;
        })(),
        uiStateJSON: '{}',
        description: '',
        savedSearchId: opts.savedSearchId,
        version: 1,
      },

      afterESResp: this._afterEsResp,
    });

    this.showInRecentlyAccessed = true;
  }

  SavedVis.type = 'visualization';

  SavedVis.mapping = {
    title: 'text',
    visState: 'json',
    uiStateJSON: 'text',
    description: 'text',
    savedSearchId: 'keyword',
    version: 'integer',
  };

  // Order these fields to the top, the rest are alphabetical
  SavedVis.fieldOrder = ['title', 'description'];

  SavedVis.searchSource = true;

  SavedVis.prototype.getFullPath = function() {
    return `/app/kibana#${VisualizeConstants.EDIT_PATH}/${this.id}`;
  };

  SavedVis.prototype._afterEsResp = async function() {
    const self = this;

    await self._getLinkedSavedSearch();
    self.searchSource.setField('size', 0);
    return self.vis ? self._updateVis() : self._createVis();
  };

  SavedVis.prototype._getLinkedSavedSearch = async function() {
    const self = this;
    const linkedSearch = !!self.savedSearchId;
    const current = self.savedSearch;

    if (linkedSearch && current && current.id === self.savedSearchId) {
      return;
    }

    if (self.savedSearch) {
      self.searchSource.setParent(self.savedSearch.searchSource.getParent());
      self.savedSearch.destroy();
      self.savedSearch = null;
    }

    if (linkedSearch) {
      self.savedSearch = await savedSearches.get(self.savedSearchId);
      self.searchSource.setParent(self.savedSearch.searchSource);
    }
  };

  SavedVis.prototype._createVis = function() {
    const self = this;

    self.visState = updateOldState(self.visState);

    // visState doesn't yet exist when importing a visualization, so we can't
    // assume that exists at this point. If it does exist, then we're not
    // importing a visualization, so we want to sync the title.
    if (self.visState) {
      self.visState.title = self.title;
    }
    self.vis = new Vis(self.searchSource.getField('index'), self.visState);

    self.vis.savedSearchId = self.savedSearchId;

    return self.vis;
  };

  SavedVis.prototype._updateVis = function() {
    const self = this;

    self.vis.indexPattern = self.searchSource.getField('index');
    self.visState.title = self.title;
    self.vis.setState(self.visState);
    self.vis.savedSearchId = self.savedSearchId;
  };

  return SavedVis;
});
