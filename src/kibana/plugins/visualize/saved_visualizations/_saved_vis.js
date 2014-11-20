define(function (require) {
  require('modules')
  .get('app/visualize')
  .factory('SavedVis', function (config, $injector, courier, Promise, savedSearches, Private, Notifier) {
    var _ = require('lodash');
    var Vis = Private(require('components/vis/vis'));

    var notify = new Notifier({
      location: 'SavedVis'
    });

    _(SavedVis).inherits(courier.SavedObject);
    function SavedVis(opts) {
      var self = this;
      opts = opts || {};
      if (typeof opts !== 'object') opts = { id: opts };

      SavedVis.Super.call(self, {
        type: SavedVis.type,

        id: opts.id,

        mapping: {
          title: 'string',
          visState: 'json',
          description: 'string',
          savedSearchId: 'string'
        },

        defaults: {
          title: 'New Visualization',
          visState: (function () {
            if (!opts.type) return null;
            var def = {};
            def.type = opts.type;
            return def;
          }()),
          description: '',
          savedSearchId: opts.savedSearchId
        },

        searchSource: true,
        indexPattern: opts.indexPattern,

        afterESResp: this._afterEsResp
      });
    }

    SavedVis.type = 'visualization';

    SavedVis.prototype._afterEsResp = function () {
      var self = this;
      var linkedSearch = self.savedSearchId;

      return Promise.resolve(linkedSearch && savedSearches.get(linkedSearch))
      .then(function (parent) {
        if (parent) {
          self.savedSearch = parent;
          self.searchSource.inherits(parent.searchSource);
        }

        self.searchSource.size(0);

        return self.vis ? self._updateVis() : self._createVis();
      })
      .then(function (vis) {
        self.searchSource.aggs(function () {
          return self.vis.aggs.toDsl();
        });

        return self;
      });
    };

    SavedVis.prototype._createVis = function () {
      var self = this;

      if (self.stateJSON) {
        self.visState = Vis.convertOldState(self.typeName, JSON.parse(self.stateJSON));
      }

      return self.vis = new Vis(
        self.searchSource.get('index'),
        self.visState
      );
    };

    SavedVis.prototype._updateVis = function () {
      var self = this;

      self.vis.indexPattern = self.searchSource.get('index');
      self.vis.setState(self.visState);
    };

    return SavedVis;
  });
});
