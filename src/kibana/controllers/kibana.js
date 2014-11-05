define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var moment = require('moment');
  var nextTick = require('utils/next_tick');
  var qs = require('utils/query_string');
  var rison = require('utils/rison');

  require('components/config/config');
  require('components/courier/courier');
  require('components/filter_bar/filter_bar');
  require('components/notify/notify');
  require('components/persisted_log/persisted_log');
  require('components/state_management/app_state');
  require('components/storage/storage');
  require('components/url/url');
  require('directives/click_focus');
  require('directives/info');
  require('directives/tooltip');
  require('directives/spinner');
  require('directives/paginate');
  require('directives/pretty_duration');
  require('directives/style_compile');
  require('directives/rows');

  require('angular-bootstrap');
  require('services/private');

  var module = require('modules').get('kibana', ['ui.bootstrap']);

  module
    .config(function ($tooltipProvider) {
      $tooltipProvider.options({
        placement: 'bottom',
        animation: true,
        popupDelay: 150,
        appendToBody: false
      });
    })
    .run(function ($rootScope) {
      $rootScope.constructor.prototype.$watchMulti = function (expressions, fn, deep) {
        if (!_.isArray(expressions)) throw new TypeError('expected an array of expressions to watch');
        if (!_.isFunction(fn)) throw new TypeError('expexted a function that is triggered on each watch');

        var $scope = this;
        var initQueue = _.clone(expressions);
        var fired = false;
        var vals = {
          new: new Array(expressions.length),
          old: new Array(expressions.length)
        };

        expressions.forEach(function (expr, i) {
          $scope.$watch(expr, function (newVal, oldVal) {
            vals.new[i] = newVal;

            if (initQueue) {
              vals.old[i] = oldVal;

              var qIdx = initQueue.indexOf(expr);
              if (qIdx !== -1) initQueue.splice(qIdx, 1);
              if (initQueue.length === 0) {
                initQueue = false;
                fn(vals.new.slice(0), vals.old.slice(0));
              }
              return;
            }

            if (fired) return;
            fired = true;
            $scope.$evalAsync(function () {
              fired = false;

              if (fn.length) {
                fn(vals.new.slice(0), vals.old.slice(0));
              } else {
                fn();
              }

              for (var i = 0; i < vals.new.length; i++) {
                vals.old[i] = vals.new[i];
              }
            });
          });
        });
      };

      $rootScope.constructor.prototype.$listen = function (emitter, eventName, handler) {
        emitter.on(eventName, handler);
        this.$on('$destroy', function () {
          emitter.off(eventName, handler);
        });
      };
    })
    .controller('kibana', function ($rootScope, $location, $scope, Notifier, $injector, $q, $http, config, kbnSetup, Private) {
      var notify = new Notifier();

      $scope.appEmbedded = $location.search().embed;
      $scope.httpActive = $http.pendingRequests;
      window.$kibanaInjector = $injector;

      // this is the only way to handle uncaught route.resolve errors
      $rootScope.$on('$routeChangeError', function (event, next, prev, err) {
        notify.fatal(err);
      });

      $q.all([
        kbnSetup(),
        config.init()
      ]).then(function () {
        $scope.setupComplete = true;
        $injector.invoke(function ($rootScope, courier, config, configFile, sessionStorage, $timeout, $location, timefilter, globalState) {

          $rootScope.globalState = globalState;

          // get/set last path for an app
          var lastPathFor = function (app, path) {
            var key = 'lastPath:' + app.id;
            if (path === void 0) {
              app.lastPath = sessionStorage.get(key) || '/' + app.id;
              return app.lastPath;
            } else {
              app.lastPath = path;
              return sessionStorage.set(key, path);
            }
          };

          $scope.apps = Private(require('registry/apps'));
          // initialize each apps lastPath (fetch it from storage)
          $scope.apps.forEach(function (app) { lastPathFor(app); });

          function onRouteChange() {
            var route = $location.path().split(/\//);
            var app = _.find($scope.apps, {id: route[1]});

            if (!app) return;

            // Record the last URL w/ state of the app, use for tab.
            lastPathFor(app, globalState.removeFromUrl($location.url()));

            // Set class of container to application-<appId>
            $scope.activeApp = route ? route[1] : null;
          }

          $rootScope.$on('$routeChangeSuccess', onRouteChange);
          $rootScope.$on('$routeUpdate', onRouteChange);

          var writeGlobalStateToLastPaths = function () {
            var currentUrl = $location.url();

            $scope.apps.forEach(function (app) {
              var url = lastPathFor(app);
              if (!url || url === currentUrl) return;

              lastPathFor(app, globalState.replaceParamInUrl(url));
            });
          };

          $scope.$listen(timefilter, 'update', function (newVal, oldVal) {
            globalState.time = _.clone(timefilter.time);
            globalState.save();
          });

          $scope.$on('application.load', function () {
            courier.start();
          });

          $scope.opts = {
            timefilter: timefilter
          };

          $scope.configure = function () {
            $scope.configureTemplateUrl = require('text!partials/global_config.html');
          };

          // expose the notification services list of notifs on the $scope so that the
          // notification directive can show them on the screen
          $scope.notifList = notify._notifs;
          // provide alternate methods for setting timeouts, which will properly trigger digest cycles
          notify._setTimerFns($timeout, $timeout.cancel);

          $scope.toggleTimepicker = function () {
            var timepickerHtml = '<kbn-timepicker from="opts.timefilter.time.from"' +
              ' to="opts.timefilter.time.to" mode="opts.timefilter.time.mode"></kbn-timepicker>';
            // Close if already open
            if ($scope.globalConfigTemplate === timepickerHtml) {
              delete $scope.globalConfigTemplate;
            } else {
              $scope.globalConfigTemplate = timepickerHtml;
            }
          };
        });
      });
    });
});
