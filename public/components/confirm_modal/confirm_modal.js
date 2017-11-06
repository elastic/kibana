import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';

export const ConfirmModal = (props) => {
  const {
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmButtonText,
    cancelButtonText,
    className,
  } = props;

  const confirm = (ev) => {
    onConfirm && onConfirm(ev);
  };

  const cancel = (ev) => {
    onCancel && onCancel(ev);
  };

  // render nothing if this component isn't open
  if (!isOpen) return null;

  return (
    <Modal
      show
      className={`canvas__confirm_modal ${className || ''}`}
      onHide={cancel}
      aria-labelledby="confirm-modal-title"
    >
      <Modal.Header>
        <Modal.Title id="confirm-modal-title">{title || 'Confirm'}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {message}
      </Modal.Body>

      <Modal.Footer>
        <Button onClick={cancel}>{cancelButtonText || 'Cancel'}</Button>
        <Button bsStyle="primary" onClick={confirm} autoFocus>{confirmButtonText || 'Confirm'}</Button>
      </Modal.Footer>
    </Modal>
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
  className: PropTypes.string,
};
