import 'ui/field_format_editor/pattern/pattern';
import uiModules from 'ui/modules';
import numeralTemplate from 'ui/field_format_editor/numeral/numeral.html';

uiModules
.get('kibana')
.directive('fieldEditorNumeral', function () {
  return {
    restrict: 'E',
    template: numeralTemplate
  };
});
