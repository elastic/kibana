import React from 'react';
import {
  EuiConfirmModal as ConfirmModal,
  EuiOverlayMask as ModalOverlay,
  EUI_MODAL_CONFIRM_BUTTON as MODAL_CONFIRM_BUTTON,
} from '@elastic/eui';
export function ModalConfirm({
  title = 'Are you sure?',
  show = false,
  message,
  onCancel,
  onConfirm,
  confirmButtonText = 'Yes',
  cancelButtonText = 'No',
}) {
  if (!show) return null;
  return (
    <ModalOverlay>
      <ConfirmModal
        title={title}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={cancelButtonText}
        confirmButtonText={confirmButtonText}
        defaultFocusedButton={MODAL_CONFIRM_BUTTON}
      >
        {message}
      </ConfirmModal>
    </ModalOverlay>
  );
}
