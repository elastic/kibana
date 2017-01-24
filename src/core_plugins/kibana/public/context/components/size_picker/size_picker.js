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
    controllerAs: 'contextSizePicker',
    link: linkContextSizePicker,
    replace: true,
    restrict: 'E',
    require: 'ngModel',
    scope: {
      count: '=',
      isDisabled: '=',
      onChangeCount: '=',
    },
    template: contextSizePickerTemplate,
  };
});

function linkContextSizePicker(scope, element, attrs, ngModel) {
  scope.countModel = ngModel;
}

function ContextSizePickerController($scope) {
  $scope.$watch(
    () => this.count,
    () => $scope.countModel.$rollbackViewValue(),
  );

  this.getOrSetCount = (count) => (
    _.isUndefined(count) ? this.count : this.onChangeCount(count)
  );
}
