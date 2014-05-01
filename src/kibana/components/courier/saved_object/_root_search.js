define(function (require) {
  return function RootSearchFactory(Private, config, $rootScope, timefilter) {
    return function makeRootSearch() {
      var SearchSource = Private(require('../data_source/search_source'));
      var indexPatterns = Private(require('../index_patterns/index_patterns'));

      var source = (new SearchSource())
        .index(config.get('defaultIndex'))
        .filter(function (source) {
          return indexPatterns.get(source.get('index'))
          .then(function (indexPattern) {
            // dynamic time filter will be called in the _flatten phase of things
            return timefilter.get(indexPattern);
          });
        });

      $rootScope.$on('change:config.defaultIndex', function () {
        source.index(config.get('defaultIndex'));
      });

      return source;
    };
  };
});