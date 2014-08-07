define(function (require) {
  return function RootSearchFactory(Private, config, $rootScope, timefilter, indexPatterns, Promise) {
    var SearchSource = Private(require('components/courier/data_source/search_source'));

    var globalSource; // the global search source - EVERYTHING inherits from this
    var appSource; // the app-level search source - reset with each app change
    var prom; // promise that must be resolved before the source is acurrate (updated by loadDefaultPattern)

    var loadDefaultPattern = function () {
      var defId = config.get('defaultIndex');

      return prom = Promise.cast(defId && indexPatterns.get(defId)).then(function (pattern) {
        globalSource.set('index', pattern);
        return appSource;
      });
    };

    globalSource = new SearchSource();

    // searchSourceManager.registerGlobal(globalSource);

    globalSource.filter(function (globalSource) {
      // dynamic time filter will be called in the _flatten phase of things
      return timefilter.get(globalSource.get('index'));
    });

    var init = function () {

      appSource = new SearchSource();
      appSource.inherits(globalSource);

      $rootScope.$on('change:config.defaultIndex', loadDefaultPattern);
      $rootScope.$on('init:config', loadDefaultPattern);

      return loadDefaultPattern();
    };

    return function () {
      return prom || init();
    };
  };
});
