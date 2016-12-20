import _ from 'lodash';

import uiModules from 'ui/modules';
import contextSizePickerTemplate from './size_picker.html';
import './size_picker.less';


const module = uiModules.get('apps/context', [
  'kibana',
  'ngRoute',
]);

module.directive('contextSizePicker', function ContextSizePicker() {
  return {
    bindToController: true,
    controller: ContextSizePickerController,
    controllerAs: 'vm',
    replace: true,
    restrict: 'E',
    scope: {
      predecessorCount: '=',
      successorCount: '=',
      setPredecessorCount: '=',
      setSuccessorCount: '=',
    },
    template: contextSizePickerTemplate,
  };
});

function ContextSizePickerController() {
  const vm = this;

  vm.getOrSetPredecessorCount = (value) => (
    _.isUndefined(value) ? vm.predecessorCount : vm.setPredecessorCount(value)
  );
  vm.getOrSetSuccessorCount = (value) => (
    _.isUndefined(value) ? vm.successorCount : vm.setSuccessorCount(value)
  );
}
