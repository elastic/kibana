import 'plugins/kibana/visualize/saved_visualizations/saved_visualizations';
import 'ui/directives/saved_object_finder';
import 'ui/directives/paginated_selectable_list';
import 'plugins/kibana/discover/saved_searches/saved_searches';
import { DashboardConstants } from 'plugins/kibana/dashboard/dashboard_constants';
import { VisualizeConstants } from '../visualize_constants';
import routes from 'ui/routes';
import RegistryVisTypesProvider from 'ui/registry/vis_types';
import uiModules from 'ui/modules';
import visualizeWizardStep1Template from './step_1.html';
import visualizeWizardStep2Template from './step_2.html';

const module = uiModules.get('app/visualize', ['kibana/courier']);

/********
/** Wizard Step 1
/********/
routes.when(VisualizeConstants.WIZARD_STEP_1_PAGE_URL, {
  template: visualizeWizardStep1Template,
  controller: 'VisualizeWizardStep1',
});

module.controller('VisualizeWizardStep1', function ($scope, $route, kbnUrl, timefilter, Private) {
  timefilter.enabled = false;

  const addToDashMode = $route.current.params[DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM];
  kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);

  $scope.visTypes = Private(RegistryVisTypesProvider);

  $scope.visTypeUrl = function (visType) {
    const baseUrl =
      visType.requiresSearch
      ? `#${VisualizeConstants.WIZARD_STEP_2_PAGE_URL}?`
      : `#${VisualizeConstants.CREATE_URL}?`;

    const params = [`type=${encodeURIComponent(visType.name)}`];

    if (addToDashMode) {
      params.push(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);
    }

    return baseUrl + params.join('&');
  };
});

/********
/** Wizard Step 2
/********/
routes.when(VisualizeConstants.WIZARD_STEP_2_PAGE_URL, {
  template: visualizeWizardStep2Template,
  controller: 'VisualizeWizardStep2',
  resolve: {
    indexPatternIds: function (courier) {
      return courier.indexPatterns.getIds();
    }
  }
});

module.controller('VisualizeWizardStep2', function ($route, $scope, timefilter, kbnUrl) {
  const type = $route.current.params.type;
  const addToDashMode = $route.current.params[DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM];
  kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);

  $scope.step2WithSearchUrl = function (hit) {
    if (addToDashMode) {
      return kbnUrl.eval(
        `#${VisualizeConstants.CREATE_URL}` +
        `?type={{type}}&savedSearchId={{id}}` +
        `&${DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM}`,
        { type: type, id: hit.id }
      );
    }

    return kbnUrl.eval(
      `#${VisualizeConstants.CREATE_URL}?type={{type}}&savedSearchId={{id}}`,
      { type: type, id: hit.id }
    );
  };

  timefilter.enabled = false;

  $scope.indexPattern = {
    selection: null,
    list: $route.current.locals.indexPatternIds
  };

  $scope.makeUrl = function (pattern) {
    if (!pattern) return;

    if (addToDashMode) {
      return `#${VisualizeConstants.CREATE_URL}` +
        `?${DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM}` +
        `&type=${type}&indexPattern=${pattern}`;
    }

    return `#${VisualizeConstants.CREATE_URL}?type=${type}&indexPattern=${pattern}`;
  };
});
