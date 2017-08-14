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
  } = props;

  const confirm = (ev) => {
    onConfirm && onConfirm(ev);
  };

  const cancel = (ev) => {
    onCancel && onCancel(ev);
  };

  return (
    <div className="modal in modal__confirm">
      {isOpen && (
        <Modal
          show={isOpen}
          keyboard
        >
          {title && (
            <Modal.Header closeButton>
              <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
          )}

          <Modal.Body>
            {message}
          </Modal.Body>

          <Modal.Footer>
            <Button onClick={cancel}>{cancelButtonText || 'Cancel'}</Button>
            &nbsp;
            <Button bsStyle="danger" onClick={confirm}>{confirmButtonText || 'Confirm'}</Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
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
