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
} from '@elastic/eui';
import React from 'react';

const ServiceForm = ({
  formId,
  onClose,
  onSave,
}: {
  formId: string;
  onClose: () => void;
  onSave: () => void;
}) => {
  return (
    <EuiModal onClose={onClose} initialFocus="[name=name]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>Create Service</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm id={formId} component="form">
          <EuiFormRow label="Service Name">
            <EuiFieldText name="name" />
          </EuiFormRow>

          <EuiFormRow label="Agent Name">
            <EuiFieldText name="agent_name" />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>

        <EuiButton type="submit" form={formId} onClick={onSave} fill disabled>
          Save
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export default ServiceForm;
