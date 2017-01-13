import uiModules from 'ui/modules';
import confirmDialogueTemplate from './confirm_dialogue.html';

const module = uiModules.get('kibana');

module.factory('showConfirmDialogue', function (ModalDialogue, $q, $compile, $rootScope) {
  /**
   * Shows a modal confirmation dialog with the given message.
   *
   * @param {String} message
   * @param {String} yesButtonText - Defaults to Okay, supply a custom string to override.
   * @param {String} noButtonText - Defaults to Cancel, supply a custom string to override.
   * @return {Promise<boolean>} Returns a promise that will be resolved to true if the user
   * clicks the yes/okay button and rejected if the user clicks the no/cancel button.
   */
  return function showConfirmDialogue(message, yesButtonText = 'Okay', noButtonText = 'Cancel') {
    const deferred = $q.defer();

    const dialogueScope = $rootScope.$new();

    let modalDialogue = undefined;

    dialogueScope.onYes = () => {
      dialogueScope.$destroy();
      modalDialogue.destroy();
      deferred.resolve(true);
    };

    dialogueScope.onNo = () => {
      dialogueScope.$destroy();
      modalDialogue.destroy();
      deferred.reject(false);
    };

    dialogueScope.message = message;

    const confirmHtml =
      `<confirm-dialogue on-yes="onYes()" 
                         on-no="onNo()"
                         message="{{message}}"
                         yes-button-text="${yesButtonText}"
                         no-button-text="${noButtonText}">
       </confirm-dialogue>`;
    const element = $compile(confirmHtml)(dialogueScope);
    modalDialogue = new ModalDialogue(element);

    return deferred.promise;
  };
});

module.directive('confirmDialogue', function () {
  return {
    restrict: 'E',
    template: confirmDialogueTemplate,
    scope: {
      message: '@',
      yesButtonText: '@',
      noButtonText: '@',
      onYes: '&',
      onNo: '&'
    }
  };
});
