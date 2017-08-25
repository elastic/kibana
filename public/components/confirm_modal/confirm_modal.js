import React from 'react';
import PropTypes from 'prop-types';
import {
  KuiModalOverlay,
  KuiConfirmModal,
} from 'ui_framework/components';

export const ConfirmModal = (props) => {
  const {
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmButtonText,
    cancelButtonText,
  } = props;

  const confirm = (ev) => {
    onConfirm && onConfirm(ev);
  };

  const cancel = (ev) => {
    onCancel && onCancel(ev);
  };

  if (!isOpen) return null;

  return (
    <KuiModalOverlay>
      <KuiConfirmModal
        message={message}
        title={title}
        onCancel={cancel}
        onConfirm={confirm}
        cancelButtonText={cancelButtonText || 'Cancel'}
        confirmButtonText={confirmButtonText || 'Confirm'}
        defaultFocusedButton="confirm"
      />
    </KuiModalOverlay>
  );
};

ConfirmModal.propTypes = {
  isOpen: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  cancelButtonText: PropTypes.string,
  confirmButtonText: PropTypes.string,
};
