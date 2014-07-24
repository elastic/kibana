define(function (require) {
  return function RootSearchSource(Private, $rootScope, config, Promise, indexPatterns, timefilter) {
    var prom; // promise that must be resolved before the source is acurrate (updated by loadDefaultPattern)
    var appSource;
    var SearchSource = Private(require('components/courier/data_source/search_source'));

    var get = function () {
      return prom || loadDefaultPattern();
    };

    var set = function (source) {
      source.inherits(globalSource);
      appSource = source;
    };

    var loadDefaultPattern = function () {
      var defId = config.get('defaultIndex');

      return prom = Promise.cast(defId && indexPatterns.get(defId)).then(function (pattern) {
        globalSource.set('index', pattern);
        return appSource;
      });
    };

    var globalSource = new SearchSource();
    globalSource.inherits(false);
    set(new SearchSource());

    globalSource.filter(function (globalSource) {
      // dynamic time filter will be called in the _flatten phase of things
      return timefilter.get(globalSource.get('index'));
    });

    $rootScope.$on('change:config.defaultIndex', loadDefaultPattern);
    $rootScope.$on('init:config', loadDefaultPattern);

    function onRouteChangeStart() {
      appSource = new SearchSource();
    }

    $rootScope.$on('$routeChangeStart', onRouteChangeStart);
    $rootScope.$on('$routeUpdate', onRouteChangeStart);

    return {
      get: get,
      set: set
    };
  };
});
