import { SearchSourceProvider } from 'ui/courier/data_source/search_source';

export function RootSearchSourceProvider(Private, $rootScope, timefilter) {
  const SearchSource = Private(SearchSourceProvider);

  const globalSource = new SearchSource();
  globalSource.inherits(false); // this is the final source, it has no parents
  globalSource.filter(function (globalSource) {
    // dynamic time filter will be called in the _flatten phase of things
    return timefilter.get(globalSource.get('index'));
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
