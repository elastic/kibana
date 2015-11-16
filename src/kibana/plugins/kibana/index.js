define(function (require) {
  // base angular components/directives we expect to be loaded
  require('angular-bootstrap');
  require('services/private');
  require('components/config/config');
  require('components/courier/courier');
  require('components/filter_bar/filter_bar');
  require('components/notify/notify');
  require('components/persisted_log/persisted_log');
  require('components/state_management/app_state');
  require('components/storage/storage');
  require('components/url/url');
  require('components/doc_title/doc_title');
  require('components/tooltip/tooltip');
  require('components/style_compile/style_compile');
  require('components/watch_multi');
  require('components/bind');
  require('components/listen');
  require('components/fancy_forms/fancy_forms');
  require('components/stringify/register');
  require('directives/click_focus');
  require('directives/info');
  require('directives/spinner');
  require('directives/paginate');
  require('directives/pretty_duration');
  require('directives/rows');

  var Notifier = require('components/notify/_notifier');

  // ensure that the kibana module requires ui.bootstrap
  require('modules')
  .get('kibana', ['ui.bootstrap'])
  .config(function ($tooltipProvider, $httpProvider, configFile) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
    $httpProvider.interceptors.push(function () {
      return {
        request: function (opts) {
          var kbnXsrfToken = configFile.xsrf_token;

          if (kbnXsrfToken) {
            var headers = opts.headers || (opts.headers = {});
            headers['kbn-xsrf-token'] = kbnXsrfToken;
          }

          return opts;
        }
      };
    });
  })
  .directive('kibana', function (Private, $rootScope, $injector, Promise, config, kbnSetup) {
    return {
      template: require('text!plugins/kibana/kibana.html'),
      controllerAs: 'kibana',
      controller: function ($scope) {
        var _ = require('lodash');
        var self = $rootScope.kibana = this;
        var notify = new Notifier({ location: 'Kibana' });

        // this is the only way to handle uncaught route.resolve errors
        $rootScope.$on('$routeChangeError', function (event, next, prev, err) {
          notify.fatal(err);
        });

        // run init functions before loading the mixins, so that we can ensure that
        // the environment is ready for them to get and use their dependencies
        self.ready = Promise.all([ kbnSetup(), config.init() ])
        .then(function () {
          // load some "mixins"
          var mixinLocals = { $scope: $scope, notify: notify };
          $injector.invoke(require('plugins/kibana/_init'), self, mixinLocals);
          $injector.invoke(require('plugins/kibana/_apps'), self, mixinLocals);
          $injector.invoke(require('plugins/kibana/_timepicker'), self, mixinLocals);

          $scope.setupComplete = true;
        });
      }
    };
  });
});
