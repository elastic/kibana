/**
 * @name SavedVis
 *
 * @extends SavedObject.
 *
 * NOTE: It's a type of SavedObject, but specific to visualizations.
 */

import { VisProvider } from 'ui/vis';
import { uiModules } from 'ui/modules';
import { updateOldState } from 'ui/vis/vis_update_state';
import { VisualizeConstants } from '../visualize_constants';
import { createLegacyClass } from 'ui/utils/legacy_class';

uiModules
  .get('app/visualize')
  .factory('SavedVis', function (config, $injector, courier, Promise, savedSearches, Private) {
    const Vis = Private(VisProvider);

    createLegacyClass(SavedVis).inherits(courier.SavedObject);
    function SavedVis(opts) {
      const self = this;
      opts = opts || {};
      if (typeof opts !== 'object') opts = { id: opts };

      SavedVis.Super.call(self, {
        type: SavedVis.type,
        mapping: SavedVis.mapping,
        searchSource: SavedVis.searchSource,

        id: opts.id,
        indexPattern: opts.indexPattern,
        defaults: {
          title: 'New Visualization',
          visState: (function () {
            if (!opts.type) return null;
            const def = {};
            def.type = opts.type;
            return def;
          }()),
          uiStateJSON: '{}',
          description: '',
          savedSearchId: opts.savedSearchId,
          version: 1
        },

        afterESResp: this._afterEsResp
      });

      this.showInRecenltyAccessed = true;
    }

    SavedVis.type = 'visualization';

    SavedVis.mapping = {
      title: 'text',
      visState: 'json',
      uiStateJSON: 'text',
      description: 'text',
      savedSearchId: 'keyword',
      version: 'integer'
    };

    // Order these fields to the top, the rest are alphabetical
    SavedVis.fieldOrder = ['title', 'description'];

    SavedVis.searchSource = true;

    SavedVis.prototype.getFullPath = function () {
      return `/app/kibana#${VisualizeConstants.EDIT_PATH}/${this.id}`;
    };

    SavedVis.prototype._afterEsResp = function () {
      const self = this;

      return self._getLinkedSavedSearch()
        .then(function () {
          self.searchSource.size(0);

          return self.vis ? self._updateVis() : self._createVis();
        });
    };

    SavedVis.prototype._getLinkedSavedSearch = Promise.method(function () {
      const self = this;
      const linkedSearch = !!self.savedSearchId;
      const current = self.savedSearch;

      if (linkedSearch && current && current.id === self.savedSearchId) {
        return;
      }

      if (self.savedSearch) {
        self.searchSource.inherits(self.savedSearch.searchSource.getParent());
        self.savedSearch.destroy();
        self.savedSearch = null;
      }

      if (linkedSearch) {
        return savedSearches.get(self.savedSearchId)
          .then(function (savedSearch) {
            self.savedSearch = savedSearch;
            self.searchSource.inherits(self.savedSearch.searchSource);
          });
      }
    });

    SavedVis.prototype._createVis = function () {
      const self = this;

      self.visState = updateOldState(self.visState);

      // visState doesn't yet exist when importing a visualization, so we can't
      // assume that exists at this point. If it does exist, then we're not
      // importing a visualization, so we want to sync the title.
      if (self.visState) {
        self.visState.title = self.title;
      }
      self.vis = new Vis(
        self.searchSource.get('index'),
        self.visState
      );

      return self.vis;
    };

    SavedVis.prototype._updateVis = function () {
      const self = this;

      self.vis.indexPattern = self.searchSource.get('index');
      self.visState.title = self.title;
      self.vis.setState(self.visState);
    };

    return SavedVis;
  });
