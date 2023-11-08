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
import { useScenarioContext } from '@kbn/apm-synthtrace-ui/src/context/use_scenario_context';
import { findNodeInATree } from '@kbn/apm-synthtrace-ui/src/common/helpers';

export type TransactionFormState = {
  name: string;
  repeat?: number;
  type: 'transaction';
};

const INITIAL_STATE: TransactionFormState = {
  name: '',
  repeat: 0,
  type: 'transaction',
};
const TransactionForm = ({
  formId,
  onClose,
  onSave,
  onEdit,
}: {
  formId: string;
  onClose: () => void;
  onSave: (payload: TransactionFormState) => void;
  onEdit: (payload: TransactionFormState, id: string) => void;
}) => {
  const { state } = useScenarioContext();
  const [isInvalid, setIsInvalid] = React.useState<boolean>(false);

  let computedState = INITIAL_STATE;

  if (state.modalForm.isEdit) {
    const existingTransaction = findNodeInATree(state.modalForm.id, state.entryTransaction);
    if (existingTransaction?.docType === 'transaction') {
      computedState = {
        name: existingTransaction.name,
        repeat: existingTransaction.repeat || 0,
        type: 'transaction',
      };
    }
  }
  const [formState, setFormState] = React.useState<TransactionFormState>(computedState);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value?.length) {
      setIsInvalid(false);
    }
    if (name === 'repeat') {
      setFormState({ ...formState, [name]: parseInt(value, 10) });
    } else {
      setFormState({ ...formState, [name]: value });
    }
  };

  const onSaveClick = () => {
    if (formState.name === '') {
      setIsInvalid(true);
    } else {
      if (state.modalForm.isEdit && state.modalForm.id) {
        onEdit(formState, state.modalForm.id);
      } else {
        onSave(formState);
      }
    }
  };

  return (
    <EuiModal onClose={onClose} initialFocus="[name=name]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {state.modalForm.isEdit ? 'Edit Transaction' : 'Create Transaction'}
        </EuiModalHeaderTitle>
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
          {state.modalForm.isEdit ? 'Edit' : 'Save'}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export default TransactionForm;
