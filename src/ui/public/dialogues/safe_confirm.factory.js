import uiModules from 'ui/modules';
import { safeConfirm } from './safe_confirm';
import './directives/confirm_dialogue';
import './modal_dialogue.factory';

const module = uiModules.get('kibana');

module.factory('safeConfirm', function ($timeout, ModalDialogue, Promise) {
  return (message, confirmButtonText = 'Okay', cancelButtonText = 'Cancel') =>
    $timeout(() => safeConfirm(message, confirmButtonText, cancelButtonText, Promise, ModalDialogue));
});
