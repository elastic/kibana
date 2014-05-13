define(function (require) {
  return function EnsureSomeIndexPatternsFn(Private, Notifier, $location, $route) {
    var errors = Private(require('../_errors'));
    var notify = new Notifier();

    return function ensureSomeIndexPatterns() {
      return function promiseHandler(patterns) {
        if (!patterns || patterns.length === 0) {
          notify.warning(new errors.NoDefinedIndexPatterns());
          $location.path('/settings/indices');
          $route.reload();
        }

        return patterns;
      };
    };
  };
});