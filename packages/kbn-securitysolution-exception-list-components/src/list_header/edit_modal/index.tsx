/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTextArea,
  EuiProgress,
} from '@elastic/eui';
import * as i18n from '../../translations';
import { ListDetails } from '../../types';
import { useEditModal } from './use_edit_modal';

interface EditModalProps {
  listDetails: ListDetails;
  onSave: (newListDetails: ListDetails) => void;
  onCancel: () => void;
}

const EditModalComponent: FC<EditModalProps> = ({ listDetails, onSave, onCancel }) => {
  const { error, modalFormId, newListDetails, showProgress, onBlur, onSubmit, onChange } =
    useEditModal({
      listDetails,
      onSave,
    });
  return (
    <EuiModal data-test-subj="EditModal" onClose={onCancel} initialFocus="[name=popswitch]">
      {showProgress && (
        <EuiProgress data-test-subj="editModalProgess" size="xs" position="absolute" />
      )}
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="editModalTitle">
          {i18n.EXCEPTION_LIST_HEADER_EDIT_MODAL_TITLE(listDetails.name)}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm
          id={modalFormId}
          data-test-subj="editModalForm"
          component="form"
          onSubmit={onSubmit}
        >
          <EuiFormRow
            error={error}
            isInvalid={!!error}
            fullWidth
            label={i18n.EXCEPTION_LIST_HEADER_NAME_TEXTBOX}
          >
            <EuiFieldText
              fullWidth
              isInvalid={!!error}
              onBlur={onBlur}
              data-test-subj="editModalNameTextField"
              name="name"
              value={newListDetails.name}
              onChange={onChange}
            />
          </EuiFormRow>

          <EuiFormRow fullWidth label={i18n.EXCEPTION_LIST_HEADER_DESCRIPTION_TEXTBOX}>
            <EuiTextArea
              fullWidth
              data-test-subj="editModalDescriptionTextField"
              name="description"
              value={newListDetails.description}
              onChange={onChange}
              onBlur={onBlur}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="editModalCancelBtn" onClick={onCancel}>
          {i18n.EXCEPTION_LIST_HEADER_EDIT_MODAL_CANCEL_BUTTON}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="editModalSaveBtn"
          type="submit"
          form={modalFormId}
          onClick={onSubmit}
          fill
        >
          {i18n.EXCEPTION_LIST_HEADER_EDIT_MODAL_SAVE_BUTTON}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
EditModalComponent.displayName = 'EditModalComponent';

export const EditModal = React.memo(EditModalComponent);

EditModal.displayName = 'EditModal';
