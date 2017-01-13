import confirmDialogueContainerTemplate from './confirm_dialogue_container.html';

/**
 * Shows a modal confirmation dialogue with the given message.
 *
 * @param {String} message
 * @param {String} confirmButtonText - Text to show for the button that will resolve the returned promise
 * @param {String} cancelButtonText - Text to show for the button that will reject the returned promise
 * @param {Promise} Promise - a promise class.
 * @param {ModalDialogue} ModalDialogue service
 * @return {Promise<boolean>} Returns an angular promise that will be resolved to true if the user
 * clicks the yes/okay button and rejected if the user clicks the no/cancel button.
 */
export function safeConfirm(message, confirmButtonText, cancelButtonText, Promise, ModalDialogue) {
  return new Promise((resolve, reject) => {
    let modalDialogue = undefined;

    const dialogueScope = {
      onConfirm: () => {
        modalDialogue.destroy();
        resolve(true);
      },
      onCancel: () => {
        modalDialogue.destroy();
        reject(false);
      },
      message,
      confirmButtonText,
      cancelButtonText
    };

    modalDialogue = new ModalDialogue(confirmDialogueContainerTemplate, dialogueScope);
  });
}
