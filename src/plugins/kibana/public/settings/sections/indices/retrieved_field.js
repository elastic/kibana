define(function (require) {
  /**
   * Returns true if the path matches the given pattern
   */
  function matchPath(pathPattern, path) {
    var pattern = pathPattern.split('.');
    var pathArr = path.split('.');

    if (pattern.length !== pathArr.length) {
      return false;
    }
    for (var i = 0; i < pattern.length; i++) {
      if (pattern[i] !== '*' && pattern[i] !== pathArr[i]) {
        return false;
      }
    }
    return true;
  }

  function process(val, name) {
    if (val.constructor === Array) {
      for (var i = 0; i < val.length; i++) {
        if (matchPath(val[i], name)) {
          return true;
        }
      }
      return false;
    } else {
      return matchPath(val, name);
    }
  }

  /**
   * Returns true if the field named "name" should be retrieved as part of
   * the _source object for each hit.
   */
  return function isRetrieved(sourceFiltering, name) {
    if (sourceFiltering === undefined) {
      return true;
    }
    if (sourceFiltering.include) {
      var inc = sourceFiltering.include;
      return process(inc, name);
    } else if (sourceFiltering.exclude) {
      var exc = sourceFiltering.exclude;
      return !process(exc, name);
    }
    return false;
  };
});
