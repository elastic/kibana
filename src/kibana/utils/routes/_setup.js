define(function (require) {
  return function routeSetup(Promise, kbnSetup, config, $route, kbnUrl, courier, Notifier, Private, $rootScope) {
    var _ = require('lodash');
    var errors = require('errors');
    var NoDefaultIndexPattern = errors.NoDefaultIndexPattern;
    var NoDefinedIndexPatterns = errors.NoDefinedIndexPatterns;
    var firstNoDefaultError = true;

    var rootSearchSource = Private(require('components/courier/data_source/_root_search_source'));
    var allowedRoutesRE = /^\/settings\//;
    var notify = new Notifier();

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
          var defaultIndexRequired = !path.match(allowedRoutesRE);

          return courier.indexPatterns.getIds()
          .then(function (patterns) {
            var defined = !!config.get('defaultIndex');
            var exists = _.contains(patterns, config.get('defaultIndex'));

            if (defined && !exists) {
              config.clear('defaultIndex');
              defined = false;
            }

            if (!defined) {
              if (defaultIndexRequired) {
                throw new NoDefaultIndexPattern();
              } else {
                firstNoDefaultError = false;
              }
            }

            return rootSearchSource.loadDefault();
          });
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
              notify.error(err);
            }
          }
        } else {
          return Promise.reject(err);
        }
      }
    };
  };
});
