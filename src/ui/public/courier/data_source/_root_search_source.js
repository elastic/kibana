import { SearchSourceProvider } from './search_source';

export function RootSearchSourceProvider(Private, $rootScope, timefilter) {
  const SearchSource = Private(SearchSourceProvider);

  const globalSource = new SearchSource();
  globalSource.inherits(false); // this is the final source, it has no parents
  globalSource.filter(function (globalSource) {
    // dynamic time filter will be called in the _flatten phase of things
    const filter = timefilter.get(globalSource.get('index'));
    // Attach a meta property to it, that we check inside visualizations
    // to remove that timefilter again because we use our explicitly passed in one.
    // This should be removed as soon as we got rid of inheritance in SearchSource
    // across the boundary or visualization.
    if (filter) {
      filter.meta = { _globalTimefilter: true };
    }
    return filter;
  });

  let appSource; // set in setAppSource()
  resetAppSource();

  // when the route changes, clear the appSource
  $rootScope.$on('$routeChangeStart', resetAppSource);

  /**
   * Get the current AppSource
   * @return {Promise} - resolved with the current AppSource
   */
  function getAppSource() {
    return appSource;
  }

  /**
   * Set the current AppSource
   * @param {SearchSource} source - The Source that represents the applications "root" search source object
   */
  function setAppSource(source) {
    appSource = source;

    // walk the parent chain until we get to the global source or nothing
    // that's where we will attach to the globalSource
    let literalRoot = source;
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
    set: setAppSource,

    getGlobalSource: function () {
      return globalSource;
    }
  };
}
