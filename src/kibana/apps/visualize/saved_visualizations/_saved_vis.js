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
        type: 'visualization',

        id: opts.id,

        mapping: {
          title: 'string',
          visState: 'json',
          description: 'string',
          savedSearchId: 'string',
          indexPattern: 'string'
        },

        defaults: {
          title: '',
          visState: (function () {
            if (!opts.type) return null;
            var def = {};
            def.type = opts.type;
            return def;
          }()),
          description: '',
          savedSearchId: opts.savedSearchId,
          indexPattern: opts.indexPattern
        },

        searchSource: true,

        afterESResp: this._afterEsResp
      });
    }

    SavedVis.prototype._afterEsResp = function () {
      var self = this;
      var relatedSearch = self.savedSearchId;
      var relatedPattern = !relatedSearch && self.indexPattern;

      var promisedParent = (function () {
        if (relatedSearch) {
          // returns a promise
          return savedSearches.get(self.savedSearchId);
        }

        var fakeSavedSearch = {
          searchSource: courier.createSource('search')
        };

        if (relatedPattern) {
          return courier.indexPatterns.get(relatedPattern)
          .then(function (indexPattern) {
            fakeSavedSearch.searchSource.index(indexPattern);
            return fakeSavedSearch;
          });
        }

        return Promise.resolve(fakeSavedSearch);
      }());

      return promisedParent
      .then(function (parent) {
        self.savedSearch = parent;

        self.searchSource
          .inherits(parent.searchSource)
          .size(0);

        if (!self.vis) {
          self.vis = self._createVis();
        } else {
          self.vis.indexPattern = self.searchSource.get('index');
          self.vis.setState(self.visState);
        }

        self.searchSource.aggs(function () {
          return self.vis.aggs.toDsl();
        });

        return self;
      });
    };

    SavedVis.prototype._createVis = function () {
      var indexPattern = this.searchSource.get('index');

      if (this.stateJSON) {
        this.visState = Vis.convertOldState(this.typeName, JSON.parse(this.stateJSON));
      }

      return new Vis(indexPattern, this.visState);
    };

    return SavedVis;
  });
});
