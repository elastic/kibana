define(function (require) {
  return function RootSearchFactory(Private, config, $rootScope, timefilter, indexPatterns, Promise) {
    var SearchSource = Private(require('./data_source/search_source'));

    var source; // the actual search source
    var prom; // promise that must be resolved before the source is acurrate (updated by loadDefaultPattern)

    var loadDefaultPattern = function () {
      var defId = config.get('defaultIndex');

      return prom = Promise.cast(defId && indexPatterns.get(defId)).then(function (pattern) {
        source.set('index', pattern);
        return source;
      });
    };

    var init = function () {
      source = new SearchSource();
      source.filter(function (source) {
        // dynamic time filter will be called in the _flatten phase of things
        return timefilter.get(source.get('index'));
      });

      $rootScope.$on('change:config.defaultIndex', loadDefaultPattern);
      $rootScope.$on('init:config', loadDefaultPattern);
      return loadDefaultPattern();
    };

    return function () {
      return prom || init();
    };
  };
});