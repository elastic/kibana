define(function (require) {
  require('ui/modules')
  .get('app/visualize')
  .factory('SavedVis', function (config, $injector, courier, Promise, savedSearches, Private, Notifier) {
    var _ = require('lodash');
    var Vis = Private(require('ui/Vis'));

    var notify = new Notifier({
      location: 'SavedVis'
    });

    _.class(SavedVis).inherits(courier.SavedObject);
    function SavedVis(opts) {
      var self = this;
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
            var def = {};
            def.type = opts.type;
            return def;
          }()),
          description: '',
          savedSearchId: opts.savedSearchId,
          version: 1
        },

        afterESResp: this._afterEsResp
      });
    }

    SavedVis.type = 'visualization';

    SavedVis.mapping = {
      title: 'string',
      visState: 'json',
      description: 'string',
      savedSearchId: 'string',
      version: 'integer'
    };

    SavedVis.searchSource = true;

    SavedVis.prototype._afterEsResp = function () {
      var self = this;

      return self._getLinkedSavedSearch()
      .then(function () {
        self.searchSource.size(0);

        return self.vis ? self._updateVis() : self._createVis();
      })
      .then(function (vis) {
        self.searchSource.aggs(function () {
          self.vis.requesting();
          return self.vis.aggs.toDsl();
        });

        return self;
      });
    };

    SavedVis.prototype._getLinkedSavedSearch = Promise.method(function () {
      var self = this;
      var linkedSearch = !!self.savedSearchId;
      var current = self.savedSearch;

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
      var self = this;

      if (self.stateJSON) {
        self.visState = Vis.convertOldState(self.typeName, JSON.parse(self.stateJSON));
      }

      self.vis = new Vis(
        self.searchSource.get('index'),
        self.visState
      );

      return self.vis;
    };

    SavedVis.prototype._updateVis = function () {
      var self = this;

      self.vis.indexPattern = self.searchSource.get('index');
      self.vis.setState(self.visState);
    };

    return SavedVis;
  });
});
