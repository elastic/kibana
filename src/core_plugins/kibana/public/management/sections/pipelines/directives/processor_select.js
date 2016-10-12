import uiModules from 'ui/modules';
import _ from 'lodash';
import '../styles/_processor_select.less';
import template from '../views/processor_select.html';
import PipelinesProvider from 'ui/pipelines';
import 'ui-select';
import processorRegistryProvider from 'ui/registry/pipelines_processors';

const app = uiModules.get('kibana');

function buildProcessorTypeList(processorRegistry) {
  const result = [];
  _.forIn(processorRegistry.byId, (registryItem) => {
    const instance = new registryItem.ViewModel(processorRegistry);
    if (instance.typeId !== 'unknown') {
      result.push({
        typeId: instance.typeId,
        title: instance.title,
        helpText: instance.helpText
      });
    }
  });

  return _(result)
    .compact()
    .sortBy('title')
    .value();
}

app.directive('processorSelect', function ($timeout, Private) {
  return {
    restrict: 'E',
    template: template,
    scope: {
      processorTypeId: '='
    },
    link: function ($scope, $element) {
      $timeout(() => {
        $element.find('.ui-select-focusser')[0].focus();
      });
    },
    controller: function ($scope, Private, Notifier) {
      const pipelines = Private(PipelinesProvider);
      const notify = new Notifier({ location: `Ingest Pipeline Setup` });
      const processorRegistry = Private(processorRegistryProvider);

      $scope.processorTypes = buildProcessorTypeList(processorRegistry);
      $scope.$watch('selectedItem.value', (newVal) => {
        if (!newVal) return;

        $scope.processorTypeId = newVal.typeId;
      });

      $scope.$watch('processorTypeId', processorTypeId => {
        if (!processorTypeId) {
          $scope.selectedItem = { value: '' };
        }
      });
    }
  };
});
