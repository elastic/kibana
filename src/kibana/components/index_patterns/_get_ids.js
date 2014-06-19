define(function (require) {
  return function GetIndexPatternIdsFn(es, configFile) {
    var _ = require('lodash');

    // many places may require the id list, so we will cache it seperately
    // didn't incorportate with the indexPattern cache to prevent id collisions.
    var cachedPromise;

    var getIds = function () {
      if (cachedPromise) return cachedPromise;

      cachedPromise = es.search({
        index: configFile.kibanaIndex,
        type: 'index-pattern',
        fields: [],
        body: {
          query: { match_all: {} }
        }
      })
      .then(function (resp) {
        return _.pluck(resp.hits.hits, '_id');
      });

      return cachedPromise;
    };

    getIds.clearCache = function () {
      cachedPromise = null;
    };

    return getIds;
  };
});