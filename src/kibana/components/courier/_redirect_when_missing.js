define(function (require) {
  return function RedirectWhenMissingFn($location, $route, globalState, Notifier, Private) {
    var SavedObjectNotFound = Private(require('./_errors')).SavedObjectNotFound;

    var notify = new Notifier();

    /**
     * Creates an error handler that will redirect to a url when a SavedObjectNotFound
     * error is thrown
     *
     * @param  {string} url - the url to redirect to
     * @return {function} - the handler to pass to .catch()
     */
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