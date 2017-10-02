import { ChangeIndexModal } from './change_index_modal';
import React from 'react';
import ReactDOM from 'react-dom';

export function showChangeIndexModal(onChange, currentIndexID, objectTitle, indices = []) {
  const container = document.createElement('div');
  const closeModal = () => {
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
      currentIndexID={currentIndexID}
      objectTitle={objectTitle}
      indices={indices}
    />
  );

  ReactDOM.render(element, container);
}
