define(function (require) {
  var errors = require('errors');
  var qs = require('utils/query_string');

  return function RedirectWhenMissingFn($location, kbnUrl, Notifier, Promise) {
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

        url = qs.replaceParamInUrl(url, 'notFound', err.savedObjectType);

        notify.error(err);
        kbnUrl.redirect(url);
        return Promise.halt();
      };
    };
  };
});