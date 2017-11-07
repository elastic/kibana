import { ChangeIndexModal } from './change_index_modal';
import React from 'react';
import ReactDOM from 'react-dom';

export function showChangeIndexModal(onChange, conflictedObjects, indices = []) {
  const container = document.createElement('div');
  const closeModal = () => {
    ReactDOM.unmountComponentAtNode(container);
    document.body.removeChild(container);
  };

  const onIndexChangeConfirmed = (newIndex) => {
    onChange(newIndex);
    closeModal();
  };

  document.body.appendChild(container);

  const element = (
    <ChangeIndexModal
      onChange={onIndexChangeConfirmed}
      onClose={closeModal}
      conflictedObjects={conflictedObjects}
      indices={indices}
    />
  );

  ReactDOM.render(element, container);
}
