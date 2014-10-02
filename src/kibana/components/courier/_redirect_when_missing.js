define(function (require) {
  var errors = require('errors');

  return function RedirectWhenMissingFn($location, kbnUrl, Notifier) {
    var SavedObjectNotFound = errors.SavedObjectNotFound;

    var notify = new Notifier();

    /**
     * Creates an error handler that will redirect to a url when a SavedObjectNotFound
     * error is thrown
     *
     * @param  {string|object} mapping - a mapping of url's to redirect to based on the saved object that
     *                                 couldn't be found, or just a string that will be used for all types
     * @return {function} - the handler to pass to .catch()
     */
    return function (mapping) {
      if (typeof mapping === 'string') {
        mapping = { '*':  mapping };
      }

      return function (err) {
        // if this error is not "404", rethrow
        if (!(err instanceof SavedObjectNotFound)) throw err;

        var url = mapping[err.savedObjectType] || mapping['*'];
        if (!url) url = '/';

        notify.error(err);
        kbnUrl.change(url);
        return;
      };
    };
  };
});