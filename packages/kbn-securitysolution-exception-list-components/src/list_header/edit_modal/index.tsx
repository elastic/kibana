/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { ChangeEvent, FC, useState, SyntheticEvent } from 'react';
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
  useGeneratedHtmlId,
  EuiTextArea,
  EuiProgress,
} from '@elastic/eui';
import * as i18n from '../../translations';
import { ListDetails } from '../../types';

interface EditModalProps {
  listDetails: ListDetails;
  onSave: (newListDetails: ListDetails) => void;
  onCancel: () => void;
}

const EditModalComponent: FC<EditModalProps> = ({ listDetails, onSave, onCancel }) => {
  const modalFormId = useGeneratedHtmlId({ prefix: 'modalForm' });
  const [newListDetails, setNewListDetails] = useState(listDetails);
  const [showProgress, setShowProgress] = useState(false);

  const onChange = ({ target }: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = target;
    setNewListDetails({ ...newListDetails, [name]: value });
  };
  const onSubmit = (e?: SyntheticEvent) => {
    setShowProgress(true);
    onSave(newListDetails);
    e?.preventDefault();
  };
  return (
    <EuiModal data-test-subj="EditModal" onClose={onSubmit} initialFocus="[name=popswitch]">
      {showProgress && <EuiProgress size="xs" position="absolute" />}
      <EuiModalHeader>
        <EuiModalHeaderTitle data-test-subj="editModalTitle">
          <h1>{i18n.EXCEPTION_LIST_HEADER_EDIT_MODAL_TITLE(listDetails.name)}</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm
          id={modalFormId}
          data-test-subj="editModalForm"
          component="form"
          onSubmit={onSubmit}
        >
          <EuiFormRow fullWidth label={i18n.EXCEPTION_LIST_HEADER_NAME_TEXTBOX}>
            <EuiFieldText
              fullWidth
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
