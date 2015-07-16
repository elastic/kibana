define(function (require) {
  function pathGetter(path) {
    path = path.split('.');
    if (path.length === 1) {
      // shortcut for non-path based get
      path = path.pop();
      return function (obj) {
        return obj[path];
      };
    }

    return function (obj) {
      for (var i = 0; obj != null && i < path.length; i++) {
        obj = obj[path[i]];
      }
      return obj;
    };
  }

  return pathGetter;
});