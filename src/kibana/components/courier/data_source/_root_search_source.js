define(function (require) {
  return function RootSearchSource(Private, $rootScope, config, Promise, indexPatterns, timefilter) {
    var prom; // promise that must be resolved before the source is acurrate (updated by loadDefaultPattern)
    var SearchSource = Private(require('components/courier/data_source/search_source'));

    var globalSource = new SearchSource();
    globalSource.inherits(false); // this is the final source, it has no parents
    globalSource.filter(function (globalSource) {
      // dynamic time filter will be called in the _flatten phase of things
      return timefilter.get(globalSource.get('index'));
    });

    var appSource; // set in setAppSource()
    resetAppSource();

    // when the default index changes, or the config is intialized, connect the defaultIndex to the globalSource
    $rootScope.$on('change:config.defaultIndex', loadDefaultPattern);
    $rootScope.$on('init:config', loadDefaultPattern);

    // when the route changes, clear the appSource
    $rootScope.$on('$routeChangeStart', resetAppSource);
    $rootScope.$on('$routeUpdate', resetAppSource);

    /**
     * Get the current AppSource
     * @return {Promise} - resolved with the current AppSource
     */
    function getAppSource() {
      return prom || loadDefaultPattern();
    }

    /**
     * Set the current AppSource
     * @param {SearchSource} source - The Source that represents the applications "root" search source object
     */
    function setAppSource(source) {
      appSource = source;
      appSource.inherits(globalSource);
    }

    /**
     * Get the default index from the config, and hook it up to the globalSource. Broken out
     * so that it can be called on config change.
     *
     * @return {Promise}
     */
    function loadDefaultPattern() {
      var defId = config.get('defaultIndex');

      return prom = Promise.cast(defId && indexPatterns.get(defId)).then(function (pattern) {
        globalSource.set('index', pattern);
        return appSource;
      });
    }

    /**
     * Sets the appSource to be a new, empty, SearchSource
     * @return {undefined}
     */
    function resetAppSource() {
      setAppSource(new SearchSource());
    }

    return {
      get: getAppSource,
      set: setAppSource
    };
  };
});
