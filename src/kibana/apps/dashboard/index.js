define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var ConfigTemplate = require('utils/config_template');

  require('directives/config');
  require('components/courier/courier');
  require('components/config/config');
  require('components/notify/notify');

  require('apps/dashboard/directives/grid');
  require('apps/dashboard/directives/panel');
  require('apps/dashboard/services/saved_dashboards');
  require('css!apps/dashboard/styles/main.css');

  var app = require('modules').get('app/dashboard', [
    'elasticsearch',
    'ngRoute',
    'kibana/courier',
    'kibana/config',
    'kibana/notify',
    'kibana/services'
  ]);

  require('routes')
  .when('/dashboard', {
    templateUrl: 'kibana/apps/dashboard/index.html',
    resolve: {
      dash: function (savedDashboards) {
        return savedDashboards.get();
      }
    }
  })
  .when('/dashboard/:id', {
    templateUrl: 'kibana/apps/dashboard/index.html',
    resolve: {
      dash: function (savedDashboards, Notifier, $route, $location, courier) {
        return savedDashboards.get($route.current.params.id)
        .catch(courier.redirectWhenMissing('/dashboard'));
      }
    }
  });

  app.directive('dashboardApp', function (Notifier, courier, savedVisualizations, AppState, timefilter) {
    return {
      controller: function ($scope, $route, $routeParams, $location, configFile) {
        var notify = new Notifier({
          location: 'Dashboard'
        });

        var dash = $scope.dash = $route.current.locals.dash;
        $scope.$on('$destroy', dash.destroy);

        var stateDefaults = {
          title: dash.title,
          panels: dash.panelsJSON ? JSON.parse(dash.panelsJSON) : []
        };

        var $state = $scope.$state = new AppState(stateDefaults);

        $scope.configTemplate = new ConfigTemplate({
          save: require('text!apps/dashboard/partials/save_dashboard.html'),
          load: require('text!apps/dashboard/partials/load_dashboard.html'),
          share: require('text!apps/dashboard/partials/share.html'),
          pickVis: require('text!apps/dashboard/partials/pick_visualization.html')
        });

        $scope.openSave = _.partial($scope.configTemplate.toggle, 'save');
        $scope.openShare = _.partial($scope.configTemplate.toggle, 'share');
        $scope.openLoad = _.partial($scope.configTemplate.toggle, 'load');
        $scope.openAdd = _.partial($scope.configTemplate.toggle, 'pickVis');
        $scope.refresh = _.bindKey(courier, 'fetch');


        timefilter.enabled(true);
        $scope.timefilter = timefilter;
        $scope.$watchCollection('globalState.time', $scope.refresh);

        $scope.save = function () {
          $state.title = dash.id = dash.title;
          $state.commit();
          dash.panelsJSON = JSON.stringify($state.panels);

          dash.save()
          .then(function () {
            notify.info('Saved Dashboard as "' + dash.title + '"');
            if (dash.id !== $routeParams.id) {
              $location.url('/dashboard/' + encodeURIComponent(dash.id));
            }
          })
          .catch(notify.fatal);
        };

        var pendingVis = 0;
        $scope.$on('ready:vis', function () {
          if (pendingVis) pendingVis--;
          if (pendingVis === 0) {
            $state.commit();
            courier.fetch();
          }
        });

        // listen for notifications from the grid component that changes have
        // been made, rather than watching the panels deeply
        $scope.$on('change:vis', function () {
          $state.commit();
        });

        // called by the saved-object-finder when a user clicks a vis
        $scope.addVis = function (hit) {
          pendingVis++;
          $state.panels.push({ visId: hit.id });
        };

        // Setup configurable values for config directive, after objects are initialized
        $scope.opts = {
          dashboard: dash,
          save: $scope.save,
          addVis: $scope.addVis,
          shareData: function () {
            return {
              link: $location.absUrl(),
              // This sucks, but seems like the cleanest way. Uhg.
              embed: $location.absUrl().replace('?', '?embed&')
            };
          }
        };

        $scope.$broadcast('application.load');
      }
    };
  });
});