import uiModules from 'ui/modules';
import confirmDialogueTemplate from './confirm_dialogue.html';

const module = uiModules.get('kibana');

module.directive('confirmDialogue', function () {
  return {
    restrict: 'E',
    template: confirmDialogueTemplate,
    scope: {
      message: '@',
      confirmButtonText: '@',
      cancelButtonText: '@',
      onConfirm: '&',
      onCancel: '&'
    }
  };
});
