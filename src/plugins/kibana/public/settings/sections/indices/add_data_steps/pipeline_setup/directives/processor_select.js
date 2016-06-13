import uiModules from 'ui/modules';
import _ from 'lodash';
import '../styles/_processor_select.less';
import template from '../views/processor_select.html';
import * as ProcessorTypes from '../processors/view_models';
import IngestProvider from 'ui/ingest';
import 'ui-select';

const app = uiModules.get('kibana');

function buildProcessorTypeList(enabledProcessorTypeIds) {
  return _(ProcessorTypes)
    .map(Type => {
      const instance = new Type();
      return {
        typeId: instance.typeId,
        title: instance.title,
        helpText: instance.helpText,
        Type
      };
    })
    .compact()
    .filter((processorType) => enabledProcessorTypeIds.includes(processorType.typeId))
    .sortBy('title')
    .value();
}

app.directive('processorSelect', function ($timeout) {
  return {
    restrict: 'E',
    template: template,
    scope: {
      processorType: '='
    },
    link: function ($scope, $element) {
      $timeout(() => {
        $element.find('.ui-select-focusser')[0].focus();
      });
    },
    controller: function ($scope, Private, Notifier) {
      const ingest = Private(IngestProvider);
      const notify = new Notifier({ location: `Ingest Pipeline Setup` });

      //determines which processors are available on the cluster
      ingest.getProcessors()
      .then((enabledProcessorTypeIds) => {
        $scope.processorTypes = buildProcessorTypeList(enabledProcessorTypeIds);
      })
      .catch(notify.error);

      $scope.$watch('selectedItem.value', (newVal) => {
        if (!newVal) return;

        $scope.processorType = newVal.Type;
      });

      $scope.$watch('processorType', processorType => {
        if (!processorType) {
          $scope.selectedItem = { value: '' };
        }
      });
    }
  };
});
