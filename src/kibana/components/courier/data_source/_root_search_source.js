define(function (require) {
  return function RootSearchSource(Private, $rootScope, config, Promise, indexPatterns, timefilter) {
    var _ = require('lodash');
    var SearchSource = Private(require('components/courier/data_source/search_source'));

    var globalSource = new SearchSource();
    globalSource.inherits(false); // this is the final source, it has no parents
    globalSource.filter(function (globalSource) {
      // dynamic time filter will be called in the _flatten phase of things
      return timefilter.get(globalSource.get('index'));
    });

    var ensureDefaultLoaded = _.once(__loadDefaultPattern__);
    var appSource; // set in setAppSource()
    resetAppSource();

    // when the default index changes, or the config is intialized, connect the defaultIndex to the globalSource
    $rootScope.$on('change:config.defaultIndex', ensureDefaultLoaded);
    $rootScope.$on('init:config', ensureDefaultLoaded);

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
     * Get the default index from the config, and hook it up to the globalSource. Broken out
     * so that it can be called on config change.
     *
     * @return {Promise}
     */
    function __loadDefaultPattern__() {
      var defId = config.get('defaultIndex');

      return Promise.cast(defId && indexPatterns.get(defId)).then(function (pattern) {
        globalSource.set('index', pattern);
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
