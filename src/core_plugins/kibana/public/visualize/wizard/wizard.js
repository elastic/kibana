
import 'plugins/kibana/visualize/saved_visualizations/saved_visualizations';
import 'ui/directives/saved_object_finder';
import 'ui/directives/paginated_selectable_list';
import 'plugins/kibana/discover/saved_searches/saved_searches';
import { DashboardConsts } from 'plugins/kibana/dashboard/dashboard_consts';
import routes from 'ui/routes';
import RegistryVisTypesProvider from 'ui/registry/vis_types';
import uiModules from 'ui/modules';
import './wizard.less';

const templateStep = function (num, txt) {
  return '<div ng-controller="VisualizeWizardStep' + num + '" class="container-fluid vis-wizard">' + txt + '</div>';
};

const module = uiModules.get('app/visualize', ['kibana/courier']);

/********
/** Wizard Step 1
/********/
routes.when('/visualize/step/1', {
  template: templateStep(1, require('plugins/kibana/visualize/wizard/step_1.html'))
});

module.controller('VisualizeWizardStep1', function ($scope, $route, kbnUrl, timefilter, Private) {
  timefilter.enabled = false;

  $scope.addToDashMode = $route.current.params[DashboardConsts.ADD_TO_DASH_PARAM];
  kbnUrl.removeParam(DashboardConsts.ADD_TO_DASH_PARAM);

  $scope.visTypes = Private(RegistryVisTypesProvider);
  $scope.visTypeUrl = function (visType) {
    const baseUrl = visType.requiresSearch ? '#/visualize/step/2?' : '#/visualize/create?';
    const params = [`type=${encodeURIComponent(visType.name)}`];
    if ($scope.addToDashMode) {
      params.push(DashboardConsts.ADD_TO_DASH_PARAM);
    }

    return baseUrl + params.join('&');
  };
});

/********
/** Wizard Step 2
/********/
routes.when('/visualize/step/2', {
  template: templateStep(2, require('plugins/kibana/visualize/wizard/step_2.html')),
  resolve: {
    indexPatternIds: function (courier) {
      return courier.indexPatterns.getIds();
    }
  }
});

module.controller('VisualizeWizardStep2', function ($route, $scope, timefilter, kbnUrl) {
  const type = $route.current.params.type;
  $scope.addToDashMode = $route.current.params[DashboardConsts.ADD_TO_DASH_PARAM];
  kbnUrl.removeParam(DashboardConsts.ADD_TO_DASH_PARAM);

  $scope.step2WithSearchUrl = function (hit) {
    if ($scope.addToDashMode) {
      return kbnUrl.eval(
        `#/visualize/create?&type={{type}}&savedSearchId={{id}}&${DashboardConsts.ADD_TO_DASH_PARAM}`,
        { type: type, id: hit.id });
    }
    return kbnUrl.eval('#/visualize/create?&type={{type}}&savedSearchId={{id}}', { type: type, id: hit.id });
  };

  timefilter.enabled = false;

  $scope.indexPattern = {
    selection: null,
    list: $route.current.locals.indexPatternIds
  };

  $scope.makeUrl = function (pattern) {
    if (!pattern) return;

    if ($scope.addToDashMode) {
      return `#/visualize/create?${DashboardConsts.ADD_TO_DASH_PARAM}&type=${type}&indexPattern=${pattern}`;
    }
    return `#/visualize/create?type=${type}&indexPattern=${pattern}`;
  };
});
