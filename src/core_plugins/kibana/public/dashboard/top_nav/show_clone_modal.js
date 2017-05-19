import { DashboardCloneModal } from './clone_modal';
import React from 'react';
import ReactDOM from 'react-dom';

export function showCloneModal(onClone, title) {
  const container = document.createElement('div');
  const closeModal = () => {
    document.body.removeChild(container);
  };

  const onCloneConfirmed = (newTitle) => {
    onClone(newTitle).then(id => {
      if (id) {
        closeModal();
      }
    });
  };
  document.body.appendChild(container);
  const element = (
    <DashboardCloneModal onClone={onCloneConfirmed} onClose={closeModal} title={title + ' Copy'}></DashboardCloneModal>
  );
  ReactDOM.render(element, container);
}
