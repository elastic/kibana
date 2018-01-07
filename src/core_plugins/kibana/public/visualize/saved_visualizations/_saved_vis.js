/**
 * @name SavedVis
 *
 * @extends SavedObject.
 *
 * NOTE: It's a type of SavedObject, but specific to visualizations.
 */

import _ from 'lodash';
import { VisProvider } from 'ui/vis';
import { uiModules } from 'ui/modules';
import { updateOldState } from 'ui/vis/vis_update_state';

uiModules
  .get('app/visualize')
  .factory('SavedVis', function (config, $injector, courier, Promise, savedSearches, Private) {
    const Vis = Private(VisProvider);

    _.class(SavedVis).inherits(courier.SavedObject);

    function SavedVis(opts) {
      opts = opts || {};
      if (typeof opts !== 'object') opts = { id: opts };

      SavedVis.Super.call(this, {
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

    SavedVis.prototype._afterEsResp = async function () {
      await this._getLinkedSavedSearch();
      this.searchSource.size(0);
      await this.vis ? this._updateVis() : this._createVis();
      this.searchSource.onRequestStart(
        (searchSource, searchRequest) => this.vis.onSearchRequestStart(searchSource, searchRequest)
      );
      this.searchSource.aggs(() => this.vis.aggs.toDsl());

      return this;
    };

    SavedVis.prototype._getLinkedSavedSearch = async function () {
      const linkedSearch = !!this.savedSearchId;
      const current = this.savedSearch;

      if (linkedSearch && current && current.id === this.savedSearchId) {
        return;
      }

      if (this.savedSearch) {
        this.searchSource.inherits(this.savedSearch.searchSource.getParent());
        this.savedSearch.destroy();
        this.savedSearch = null;
      }

      if (linkedSearch) {
        this.savedSearch = await savedSearches.get(this.savedSearchId);
        this.searchSource.inherits(this.savedSearch.searchSource);
      }
    };

    SavedVis.prototype._createVis = function () {
      this.visState = updateOldState(this.visState);

      // visState doesn't yet exist when importing a visualization, so we can't
      // assume that exists at this point. If it does exist, then we're not
      // importing a visualization, so we want to sync the title.
      if (this.visState) {
        this.visState.title = this.title;
      }
      this.vis = new Vis(
        this.searchSource.get('index'),
        this.visState
      );

      return this.vis;
    };

    SavedVis.prototype._updateVis = function () {
      this.vis.indexPattern = this.searchSource.get('index');
      this.visState.title = this.title;
      this.vis.setState(this.visState);
    };

    return SavedVis;
  });
