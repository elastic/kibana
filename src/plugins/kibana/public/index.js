define(function (require) {
  var Notifier = require('components/notify/_notifier');

  // ensure that the kibana module requires ui.bootstrap
  require('modules')
  .get('kibana', ['ui.bootstrap'])
  .config(function ($tooltipProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  })
  .directive('kibana', function (Private, $rootScope, $injector, Promise, config) {
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
        self.ready = Promise.all([ config.init() ])
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
