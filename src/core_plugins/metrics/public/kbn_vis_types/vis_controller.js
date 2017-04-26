import { uiModules } from 'ui/modules';
import 'ui/state_management/app_state';
import '../directives/visualization';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';

const app = uiModules.get('kibana/metrics_vis');

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
    return;
  }
  // We need to watch the app state for changes to the dark theme attribute.
  $scope.state = getAppState();
  $scope.$watch('state.options.darkTheme', newValue => {
    $scope.reversed = Boolean(newValue);
  });

  const queryFilter = Private(FilterBarQueryFilterProvider);
  const createFetch = Private(require('../lib/fetch'));
  const fetch = () => {
    const fn = createFetch($scope);
    return fn().then((resp) => {
      $element.trigger('renderComplete');
      return resp;
    });
  };


  $scope.model = $scope.vis.params;
  $scope.$watch('vis.params', fetch);

  // All those need to be consolidated
  $scope.$listen(timefilter, 'fetch', fetch);
  $scope.$listen(queryFilter, 'fetch', fetch);

  $scope.$on('courier:searchRefresh', fetch);
  $scope.$on('fetch', fetch);
});
