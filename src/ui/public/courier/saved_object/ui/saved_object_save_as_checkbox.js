import { uiModules } from '../../../modules';
import saveObjectSaveAsCheckboxTemplate from './saved_object_save_as_checkbox.html';

uiModules
  .get('kibana')
  .directive('savedObjectSaveAsCheckBox', function () {
    return {
      restrict: 'E',
      template: saveObjectSaveAsCheckboxTemplate,
      replace: true,
      scope: {
        savedObject: '='
      }
    };
  });
