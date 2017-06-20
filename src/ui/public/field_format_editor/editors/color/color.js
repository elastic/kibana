import './color.less';
import colorTemplate from './color.html';
import _ from 'lodash';
import { DEFAULT_COLOR } from 'ui/stringify/types/color_default';

export function colorEditor() {
  return {
    formatId: 'color',
    editor: {
      template: colorTemplate,
      controller($scope) {
        $scope.$watch('editor.field.type', type => {
          $scope.editor.formatParams.fieldType = type;
        });

        $scope.addColor = function () {
          $scope.editor.formatParams.colors.push(_.cloneDeep(DEFAULT_COLOR));
        };

        $scope.removeColor = function (index) {
          $scope.editor.formatParams.colors.splice(index, 1);
        };
      }
    }
  };
}
