import uiModules from 'ui/modules';
import $ from 'jquery';
import template from '../views/pipeline_inputs_menu.html';
import selectedTemplate from '../partials/_pipeline_inputs_menu_selected.html';
import buttonsTemplate from '../partials/_pipeline_inputs_menu_buttons.html';
import statusTemplate from '../partials/_pipeline_inputs_menu_status.html';
import sampleTemplate from '../partials/_pipeline_inputs_menu_sample.html';
import { assign, isEmpty, map, get } from 'lodash';
import modes from '../lib/constants/pipeline_modes';
import '../styles/pipeline_inputs_menu.less';
import { Sample } from 'ui/pipelines/sample_collection/view_model';

const app = uiModules.get('kibana');

app.directive('pipelineInputsMenu', function ($timeout) {
  return {
    restrict: 'E',
    template: template,
    scope: {
      pipeline: '=',
      mode: '=',
      sample: '='
    },
    link: function ($scope, $el, attrs) {
      $scope.$watch('sampleCollection.index', (index) => {
        $timeout(() => {
          const $paginateScope = $el.find('paginate').scope();
          if (!$paginateScope) return;

          const paginate = $paginateScope.paginate;
          const newPage = Math.ceil((index + 1) / paginate.perPage);
          paginate.goToPage(newPage);
        });
      });
    },
    controller: function ($scope) {
      const pipeline = $scope.pipeline;
      const sampleCollection = $scope.sampleCollection = pipeline.sampleCollection;
      $scope.states = Sample.states;
      $scope.isEmpty = isEmpty;

      $scope.addFromLogs = () => {
        $scope.mode = modes.INPUT_LOGS;
      };

      $scope.addFromJson = () => {
        $scope.sample = new Sample();
        $scope.mode = modes.INPUT_JSON;
      };

      const selectSample = (index) => {
        sampleCollection.index = index;
        $scope.mode = modes.PIPELINE;
      };

      const deleteSample = (sample) => {
        sampleCollection.remove(sample);
      };

      const editSample = (sample) => {
        $scope.sample = sample;
        $scope.mode = modes.INPUT_JSON;
      };

      const duplicateSample = (sample) => {
        const newSample = new Sample(sample.model);

        sampleCollection.add(newSample);
      };

      const buildRows = () => {
        $scope.rows = map(sampleCollection.samples, (sample, index) => {
          const rowScope = assign($scope.$new(), {
            index: index,
            sample: sample,
            buildRows: buildRows,
            selectSample: selectSample,
            deleteSample: deleteSample,
            editSample: editSample,
            duplicateSample: duplicateSample
          });

          return [
            {
              markup: selectedTemplate,
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
