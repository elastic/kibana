import modules from 'ui/modules';
import '../services/executor';
import createNewPanel from '../lib/create_new_panel';
import '../directives/vis_editor';
import _ from 'lodash';
import angular from 'angular';
const app = modules.get('kibana/metrics_vis', ['kibana']);
app.controller('MetricsEditorController', (
  $location,
  $element,
  $scope,
  Private,
  timefilter,
  metricsExecutor
) => {

  $scope.embedded = $location.search().embed === 'true';
  const queryFilter = Private(require('ui/filter_bar/query_filter'));
  const createFetch = Private(require('../lib/fetch'));
  const fetch = () => {
    const fn = createFetch($scope);
    return fn().then((resp) => {
      $element.trigger('renderComplete');
      return resp;
    });
  };
  const fetchFields = Private(require('../lib/fetch_fields'));

  const debouncedFetch = _.debounce(() => {
    fetch();
  }, 1000, {
    leading: false,
    trailing: true
  });

  const debouncedFetchFields = _.debounce(fetchFields($scope), 1000, {
    leading: false,
    trailing: true
  });

  // If the model doesn't exist we need to either intialize it with a copy from
  // the $scope.vis._editableVis.params or create a new panel all together.
  if (!$scope.model) {
    if ($scope.vis._editableVis.params.type) {
      $scope.model = _.assign({}, $scope.vis._editableVis.params);
    } else {
      $scope.model = createNewPanel();
      angular.copy($scope.model, $scope.vis._editableVis.params);
    }
  }

  $scope.$watchCollection('model', newValue => {
    angular.copy(newValue, $scope.vis._editableVis.params);
    $scope.stageEditableVis();
    debouncedFetch();

    const patternsToFetch = [];
    // Fetch any missing index patterns
    if (!$scope.fields[newValue.index_pattern]) {
      patternsToFetch.push(newValue.index_pattern);
    }

    newValue.series.forEach(series => {
      if (series.override_index_pattern &&
        !$scope.fields[series.series_index_pattern]) {
        patternsToFetch.push(series.series_index_pattern);
      }
    });

    if (newValue.annotations) {
      newValue.annotations.forEach(item => {
        if (item.index_pattern &&
          !$scope.fields[item.index_pattern]) {
          patternsToFetch.push(item.index_pattern);
        }
      });
    }

    if(patternsToFetch.length) {
      debouncedFetchFields(_.unique(patternsToFetch));
    }
  });

  $scope.visData = {};
  $scope.fields = {};
  // All those need to be consolidated
  $scope.$listen(queryFilter, 'fetch', fetch);
  $scope.$on('fetch', fetch);

  fetchFields($scope)($scope.model.index_pattern);

  // Register fetch
  metricsExecutor.register({ execute: fetch });

  // Start the executor
  metricsExecutor.start();

  // Destory the executor
  $scope.$on('$destroy', metricsExecutor.destroy);

});

