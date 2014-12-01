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
  require('components/listen');
  require('directives/click_focus');
  require('directives/info');
  require('directives/spinner');
  require('directives/paginate');
  require('directives/pretty_duration');
  require('directives/rows');

  var Notifier = require('components/notify/_notifier');

  // ensure that the kibana module requires ui.bootstrap
  require('modules').get('kibana', ['ui.bootstrap'])
  .directive('kibana', function ($rootScope, $injector, Promise, config, kbnSetup) {
    return {
      template: require('text!plugins/kibana/kibana.html'),
      controller: function ($scope) {
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
