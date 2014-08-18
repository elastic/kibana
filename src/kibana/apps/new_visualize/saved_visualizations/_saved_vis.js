define(function (require) {
  require('modules')
  .get('app/visualize')
  .factory('SavedVis', function (config, $injector, courier, Promise, savedSearches, Private, Notifier) {
    var _ = require('lodash');
    var inherits = require('lodash').inherits;
    var Vis = Private(require('components/vis/vis'));

    var notify = new Notifier({
      location: 'SavedVis'
    });

    function SavedVis(opts) {
      var self = this;
      opts = opts || {};
      if (typeof opts !== 'object') opts = { id: opts };

      courier.SavedObject.call(self, {
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
          visState: null,
          description: '',
          savedSearchId: opts.savedSearchId,
          indexPattern: opts.indexPattern
        },

        searchSource: true,

        afterESResp: function setVisState() {
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

            if (!self.vis) self._createVis();
            else self._updateVis();

            self.searchSource.aggs(function () {
              return self.vis.aggs.toDSL();
            });

            return self;
          });
        }
      });
    }
    inherits(SavedVis, courier.SavedObject);

    SavedVis.prototype._createVis = function () {
      var indexPattern = this.searchSource.get('index');

      if (this.stateJSON) {
        this.visState = Vis.convertOldState(this.typeName, JSON.parse(this.stateJSON));
      }

      this.vis = new Vis(indexPattern, this.visState);
    };

    SavedVis.prototype._updateVis = function () {
      this.vis.indexPattern = this.searchSource.get('index');
      this.vis.setConfig(this.visState);
    };

    return SavedVis;
  });
});
