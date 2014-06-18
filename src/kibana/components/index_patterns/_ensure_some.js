define(function (require) {
  return function EnsureSomeIndexPatternsFn(Private, Notifier, $location, $route) {
    var errors = require('errors');
    var notify = new Notifier();

    return function ensureSomeIndexPatterns() {
      return function promiseHandler(patterns) {
        if (!patterns || patterns.length === 0) {
          notify.warning(new errors.NoDefinedIndexPatterns());
          $route.change('/settings/indices');
        }

        return patterns;
      };
    };
  };
});