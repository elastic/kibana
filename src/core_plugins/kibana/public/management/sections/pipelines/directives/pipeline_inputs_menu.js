import uiModules from 'ui/modules';
import template from '../views/pipeline_inputs_menu.html';
import buttonsTemplate from '../partials/_pipeline_inputs_menu_buttons.html';
import statusTemplate from '../partials/_pipeline_inputs_menu_status.html';
import sampleTemplate from '../partials/_pipeline_inputs_menu_sample.html';
import { assign, isEmpty, map, get } from 'lodash';
import modes from '../lib/constants/pipeline_modes';
import '../styles/pipeline_inputs_menu.less';
import { Sample } from 'ui/pipelines/lib/sample_collection';

const app = uiModules.get('kibana');

app.directive('pipelineInputsMenu', function () {
  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '=',
      mode: '=',
      sample: '='
    },
    controller: function ($scope) {
      const pipeline = $scope.pipeline;
      const sampleCollection = $scope.sampleCollection = pipeline.sampleCollection;
      $scope.states = Sample.states;
      $scope.isEmpty = isEmpty;

      $scope.returnToPipeline = () => {
        $scope.mode = modes.PIPELINE;
      };

      $scope.addFromLogs = () => {
        $scope.mode = modes.INPUT_LOGS;
      };

      $scope.addFromJson = () => {
        $scope.sample = new Sample();
        $scope.mode = modes.INPUT_JSON;
      };

      const deleteSample = (sample) => {
        sampleCollection.remove(sample);
      };

      const editSample = (sample) => {
        $scope.sample = sample;
        $scope.mode = modes.INPUT_JSON;
      };

      const duplicateSample = (sample) => {
        const newSample = new Sample(sample.doc);
        newSample.description = sample.description;

        sampleCollection.add(newSample);
      };

      const buildRows = () => {
        $scope.rows = map(sampleCollection.samples, (sample, index) => {
          const rowScope = assign($scope.$new(), {
            index: index,
            sample: sample,
            buildRows: buildRows,
            deleteSample: deleteSample,
            editSample: editSample,
            duplicateSample: duplicateSample
          });

          return [
            {
              markup: '<input type="radio" name="selected" ng-model="sampleCollection.index" ng-value="index" />',
              scope: rowScope
            },
            {
              markup: statusTemplate,
              scope: rowScope,
              value: sample.state
            },
            {
              markup: sampleTemplate,
              scope: rowScope,
              value: sample.description || sample.doc
            },
            {
              markup: buttonsTemplate,
              scope: rowScope
            }
          ];
        });
      };

      $scope.columns = [
        {title: '', sortable: false},
        {title: 'Status'},
        {title: 'Sample'},
        {title: '', sortable: false}
      ];

      $scope.$watchCollection('sampleCollection.samples', () => {
        buildRows();
      });
    }
  };
});
