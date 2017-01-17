import modules from 'ui/modules';
import $ from 'jquery';
import createNewPanel from '../lib/create_new_panel';
import '../directives/vis_editor';
import _ from 'lodash';
import angular from 'angular';
const app = modules.get('kibana/metrics_vis');
app.controller('MetricsEditorController', (
  $scope,
  $element,
  Private,
  timefilter,
  globalNavState
) => {

  const queryFilter = Private(require('ui/filter_bar/query_filter'));
  const fetch = Private(require('../lib/fetch'));
  const fetchFields = Private(require('../lib/fetch_fields'));

  const globalNavUnsub = $scope.$watch(() => {
    return globalNavState.isOpen();
  }, newValue => {
    if (newValue) {
      $scope.editorWidth = '180px';
    } else {
      $scope.editorWidth = '53px';
    }
  });

  $scope.$on('$destory', globalNavUnsub);

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

  $scope.$watchCollection('model', (newValue, oldValue) => {
    angular.copy(newValue, $scope.vis.params);
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
  });

  // If the model doesn't exist we need to either intialize it with a copy from
  // the $scope.vis.params or create a new panel all together.
  if (!$scope.model) {
    if ($scope.vis.params.type) {
      $scope.model = _.assign({}, $scope.vis.params);
    } else {
      $scope.model = createNewPanel();
    }
  }

  $scope.visData = {};
  $scope.fields = [];
  // All those need to be consolidated
  $scope.$listen(timefilter, 'fetch', fetch($scope));
  $scope.$listen(queryFilter, 'fetch', fetch($scope));
  $scope.$on('courier:searchRefresh', fetch($scope));
  $scope.$on('fetch', fetch($scope));
  fetchFields($scope)($scope.model.index_pattern);

});

