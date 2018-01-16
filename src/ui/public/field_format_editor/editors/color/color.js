import './color.less';
import colorTemplate from './color.html';
import { DEFAULT_COLOR } from '../../../../../core_plugins/kibana/common/field_formats/types/color_default';

export function colorEditor() {
  return {
    formatId: 'color',
    template: colorTemplate,
    controller($scope) {
      $scope.$watch('editor.field.type', (type) => {
        $scope.editor.formatParams.fieldType = type;
      });

      $scope.addColor = function () {
        $scope.editor.formatParams.colors.push({ ...DEFAULT_COLOR });
      };

      $scope.removeColor = function (index) {
        $scope.editor.formatParams.colors.splice(index, 1);
      };
    }
  };
}
