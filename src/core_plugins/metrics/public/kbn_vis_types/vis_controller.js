import modules from 'ui/modules';
import 'plugins/timelion/directives/refresh_hack';
import 'ui/state_management/app_state';
import '../directives/visualization';
const app = modules.get('kibana/metrics_vis');

app.controller('MetricsVisController', (
  $scope,
  $element,
  Private,
  timefilter,
  getAppState,
  $location
) => {

  // If we are in the visualize editor context (and not embedded) we should not
  // render the visualizations. This is handled by the editor itself.
  const embedded = $location.search().embed === 'true';
  if (!embedded && $scope.vis._editableVis) {
    $scope.displayVis = false;
    return;
  } else {
    $scope.displayVis = true;
  }

  // We need to watch the app state for changes to the dark theme attribute.
  $scope.state = getAppState();
  $scope.$watch('state.options.darkTheme', newValue => {
    $scope.backgroundColor = newValue ? '#272727' : '#FFF';
  });

  const queryFilter = Private(require('ui/filter_bar/query_filter'));
  const fetch = Private(require('../lib/fetch'));

  $scope.model = $scope.vis.params;
  $scope.$watch('vis.params', fetch($scope));

  // All those need to be consolidated
  $scope.$listen(timefilter, 'fetch', fetch($scope));
  $scope.$listen(queryFilter, 'fetch', fetch($scope));
  $scope.$on('courier:searchRefresh', fetch($scope));
  $scope.$on('fetch', fetch($scope));

  $scope.$on('renderComplete', event => {
    event.stopPropagation();
    $element.trigger('renderComplete');
  });

});
