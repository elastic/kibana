define(function (require) {
  return function routeSetup(Promise, kbnSetup, config, $route, indexPatterns, Notifier) {

    var errors = require('errors');
    var NoDefaultIndexPattern = errors.NoDefaultIndexPattern;
    var NoDefinedIndexPatterns = errors.NoDefinedIndexPatterns;

    return {
      routeSetupWork: function () {
        return Promise.all([
          kbnSetup(),
          config.init(),
        ])
        .then(function () {
          if (!$route.current.$$route.originalPath.match(/settings\/indices/)) {
            return indexPatterns.getIds()
            .then(function (patterns) {
              if (!patterns || patterns.length === 0) {
                throw new errors.NoDefinedIndexPatterns();
              }

              if (!config.get('defaultIndex')) {
                throw new NoDefaultIndexPattern();
              }
            });
          }
        });
      },
      handleKnownError: function (err) {
        if (err instanceof NoDefaultIndexPattern || err instanceof NoDefinedIndexPatterns) {
          // .change short circuits the routes by calling $route.refresh(). We can safely swallow this error
          // after reporting it to the user
          $route.change('/settings/indices');
          (new Notifier()).error(err);
        } else {
          return Promise.reject(err);
        }
      }
    };
  };
});