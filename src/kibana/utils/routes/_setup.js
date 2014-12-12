define(function (require) {
  return function routeSetup(Promise, kbnSetup, config, $route, kbnUrl, courier, Notifier, Private, $rootScope) {
    var errors = require('errors');
    var NoDefaultIndexPattern = errors.NoDefaultIndexPattern;
    var NoDefinedIndexPatterns = errors.NoDefinedIndexPatterns;
    var firstNoDefaultError = true;

    var rootSearchSource = Private(require('components/courier/data_source/_root_search_source'));
    var allowedRoutesRE = /^\/settings\//;

    return {
      routeSetupWork: function () {
        return Promise.all([
          kbnSetup(),
          config.init(),
          courier.SearchSource.ready,
          $rootScope.kibana.ready
        ])
        .then(function () {
          var path = $route.current.$$route.originalPath;
          if (!path.match(allowedRoutesRE)) {
            return courier.indexPatterns.getIds()
            .then(function (patterns) {
              if (!config.get('defaultIndex')) {
                throw new NoDefaultIndexPattern();
              } else {
                firstNoDefaultError = false;
                return rootSearchSource.loadDefault();
              }
            });
          }
        });
      },
      handleKnownError: function (err) {
        if (err instanceof NoDefaultIndexPattern || err instanceof NoDefinedIndexPatterns) {
          // .change short circuits the routes by calling $route.refresh(). We can safely swallow this error
          // after reporting it to the user
          kbnUrl.change('/settings/indices');

          if (err instanceof NoDefaultIndexPattern) {
            if (firstNoDefaultError) {
              firstNoDefaultError = false;
            } else {
              (new Notifier()).error(err);
            }
          }
        } else {
          return Promise.reject(err);
        }
      }
    };
  };
});
