import _ from 'lodash';
import uiModules from 'ui/modules';
import contextSizePickerTemplate from './size_picker.html';
import './size_picker.less';

const module = uiModules.get('apps/context', [
  'kibana',
]);

module.directive('contextSizePicker', function ContextSizePicker() {
  return {
    bindToController: true,
    controller: ContextSizePickerController,
    controllerAs: 'vm',
    replace: true,
    restrict: 'E',
    scope: {
      count: '=',
      setCount: '=',
    },
    template: contextSizePickerTemplate,
  };
});


function ContextSizePickerController() {
  const vm = this;

  vm.getOrSetCount = (count) => (
    _.isUndefined(count) ? vm.count : vm.setCount(count)
  );
}
