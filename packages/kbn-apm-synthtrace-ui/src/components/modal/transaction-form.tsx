import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldNumber,
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

export type TransactionFormState = {
  name: string;
  repeat?: number;
  type: 'transaction';
};
const TransactionForm = ({
  formId,
  onClose,
  onSave,
}: {
  formId: string;
  onClose: () => void;
  onSave: (payload: TransactionFormState) => void;
}) => {
  const [isInvalid, setIsInvalid] = React.useState<boolean>(false);
  const [formState, setFormState] = React.useState<TransactionFormState>({
    name: '',
    repeat: 0,
    type: 'transaction',
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value?.length) {
      setIsInvalid(false);
    }
    setFormState({ ...formState, [name]: value });
  };

  const onSaveClick = () => {
    if (formState.name === '') {
      setIsInvalid(true);
    } else {
      onSave(formState);
    }
  };

  return (
    <EuiModal onClose={onClose} initialFocus="[name=name]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>Create Transaction</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm id={formId} component="form">
          <EuiFormRow label="Transaction Name" isInvalid={isInvalid} error="Name is mandatory">
            <EuiFieldText
              name="name"
              isInvalid={isInvalid}
              onChange={onChange}
              value={formState.name}
            />
          </EuiFormRow>

          <EuiFormRow label="Repeat" helpText="# of times">
            <EuiFieldNumber name="repeat" onChange={onChange} value={formState.repeat} />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
        <EuiButton type="submit" form={formId} onClick={onSaveClick} fill>
          Save
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export default TransactionForm;
