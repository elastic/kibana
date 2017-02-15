import modules from 'ui/modules';
import '../services/executor';
import 'plugins/timelion/directives/refresh_hack';
import $ from 'jquery';
import createNewPanel from '../lib/create_new_panel';
import '../directives/vis_editor';
import _ from 'lodash';
import angular from 'angular';
const app = modules.get('kibana/metrics_vis', ['kibana']);
app.controller('MetricsEditorController', (
  $scope,
  Private,
  timefilter,
  metricsExecutor
) => {

  const queryFilter = Private(require('ui/filter_bar/query_filter'));
  const fetch = Private(require('../lib/fetch'));
  const fetchFields = Private(require('../lib/fetch_fields'));

  const debouncedFetch = _.debounce(() => {
    fetch($scope)();
  }, 300, {
    leading: false,
    trailing: true
  });

  const debouncedFetchFields = _.debounce(fetchFields($scope), 300, {
    leading: false,
    trailing: true
  });

  // If the model doesn't exist we need to either intialize it with a copy from
  // the $scope.vis.params or create a new panel all together.
  if (!$scope.model) {
    if ($scope.vis.params.type) {
      $scope.model = _.assign({}, $scope.vis.params);
    } else {
      $scope.model = createNewPanel();
      angular.copy($scope.model, $scope.vis._editableVis.params);
    }
  }

  $scope.$watchCollection('model', (newValue, oldValue) => {
    angular.copy(newValue, $scope.vis._editableVis.params);
    // When the content of the model changes we need to stage the changes to
    // the Editable visualization. Normally this is done through clicking the
    // play which triggers `stageEditableVis` in kibana/public/visualize/editor/editor.js
    // but because we are auto running everything that doesn't work with our worflow
    // plus it's covered up by the Thor editor UI.
    const visAppScope = angular.element($('visualize-app')).scope();
    visAppScope.stageEditableVis();
    debouncedFetch();

    // Fetch any missing index patterns
    if (!$scope.fields[newValue.index_pattern]) debouncedFetchFields(newValue.index_pattern);
    newValue.series.forEach(series => {
      if (series.override_index_pattern &&
        !$scope.fields[series.series_index_pattern]) {
        debouncedFetchFields(series.series_index_pattern);
      }
    });
    if (newValue.annotations) {
      newValue.annotations.forEach(item => {
        if (item.index_pattern &&
          !$scope.fields[item.index_pattern]) {
          debouncedFetchFields(item.index_pattern);
        }
      });
    }
  });

  $scope.visData = {};
  $scope.fields = {};
  // All those need to be consolidated
  $scope.$listen(queryFilter, 'fetch', fetch($scope));
  $scope.$on('fetch', fetch($scope));

  fetchFields($scope)($scope.model.index_pattern);

  // Register fetch
  metricsExecutor.register({ execute: fetch($scope) });

  // Start the executor
  metricsExecutor.start();

  // Destory the executor
  $scope.$on('$destroy', metricsExecutor.destroy);

});

