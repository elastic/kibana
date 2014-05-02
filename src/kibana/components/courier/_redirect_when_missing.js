define(function (require) {
  return function RedirectWhenMissingFn($location, $route, globalState, Notifier, Private) {
    var SavedObjectNotFound = Private(require('./_errors')).SavedObjectNotFound;

    var notify = new Notifier();

    return function (url) {
      return function (err) {
        // if this error is not "404", rethrow
        if (!(err instanceof SavedObjectNotFound)) throw err;

        notify.error(err);
        $location.url(globalState.writeToUrl(url));
        $route.reload();
        return;
      };
    };
  };
});