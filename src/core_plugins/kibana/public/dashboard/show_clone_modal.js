import template from './show_clone_template.html';
import { ModalOverlay } from 'ui/modals';
import angular from 'angular';

export function showCloneModal(onClone, title, $rootScope, $compile) {
  let modalPopover;
  const cloneScope = $rootScope.$new();
  const closeModal = () => {
    modalPopover.destroy();
    modalPopover = undefined;
    angular.element(document.body).off('keydown');
    cloneScope.$destroy();
  };

  const onCloneConfirmed = (newTitle) => {
    onClone(newTitle).then(id => {
      if (id) {
        closeModal();
      }
    });
  };

  cloneScope.onClone = onCloneConfirmed;
  cloneScope.onClose = closeModal;
  cloneScope.title = title;

  const modalInstance = $compile(template)(cloneScope);
  modalPopover = new ModalOverlay(modalInstance);
  angular.element(document.body).on('keydown', (event) => {
    if (event.keyCode === 27) {
      cloneScope.onClose();
    }
  });
}
