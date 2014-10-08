define(function (require) {
  return function RootSearchSource(Private, $rootScope, config, Promise, indexPatterns, timefilter, Notifier) {
    var _ = require('lodash');
    var SearchSource = Private(require('components/courier/data_source/search_source'));

    var notify = new Notifier({ location: 'Root Search Source' });

    var globalSource = new SearchSource();
    globalSource.inherits(false); // this is the final source, it has no parents
    globalSource.filter(function (globalSource) {
      // dynamic time filter will be called in the _flatten phase of things
      return timefilter.get(globalSource.get('index'));
    });

    var appSource; // set in setAppSource()
    resetAppSource();

    /**
     * Get the default index from the config, and hook it up to the globalSource. Broken out
     * so that it can be called on config change.
     *
     * @return {Promise}
     */
    function reloadDefaultPattern() {
      // replace the "ensureDefaultLoaded" fn, so it will wait for this reload to complete
      ensureDefaultLoaded = _.once(function () {
        return notify.event('loading default index pattern', function () {
          var defId = config.get('defaultIndex');

          return Promise.cast(defId && indexPatterns.get(defId))
          .then(function (pattern) {
            globalSource.set('index', pattern);
            notify.log('index pattern set to', defId);
          });
        })
        .catch(notify.fatal);
      });

      return ensureDefaultLoaded();
    }

    var ensureDefaultLoaded;
    reloadDefaultPattern();

    // when the default index changes, or the config is intialized, connect the defaultIndex to the globalSource
    $rootScope.$on('init:config', reloadDefaultPattern);
    $rootScope.$on('change:config.defaultIndex', reloadDefaultPattern);

    // when the route changes, clear the appSource
    $rootScope.$on('$routeChangeStart', resetAppSource);

    /**
     * Get the current AppSource
     * @return {Promise} - resolved with the current AppSource
     */
    function getAppSource() {
      return ensureDefaultLoaded().then(function () {
        return appSource;
      });
    }

    /**
     * Set the current AppSource
     * @param {SearchSource} source - The Source that represents the applications "root" search source object
     */
    function setAppSource(source) {
      appSource = source;

      // walk the parent chain until we get to the global source or nothing
      // that's where we will attach to the globalSource
      var literalRoot = source;
      while (literalRoot._parent && literalRoot._parent !== globalSource) {
        literalRoot = literalRoot._parent;
      }

      literalRoot.inherits(globalSource);
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
