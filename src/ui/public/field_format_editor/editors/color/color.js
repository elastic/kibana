import './color.less';
import colorTemplate from './color.html';
import _ from 'lodash';

export function colorEditor() {

  const DEFAULT_COLOR = {
    range: `${Number.NEGATIVE_INFINITY}:${Number.POSITIVE_INFINITY}`,
    regex: '<insert regex>',
    text: '#000000',
    background: '#ffffff'
  };

  return {
    formats: ['color'],
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
