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

type InvalidType = {
  name: boolean;
  span_type: boolean;
  sub_type: boolean;
};

export type SpanFormState = {
  name: string;
  span_type: string;
  sub_type: string;
  repeat: number;
  type: 'span';
};

const INITIAL_STATE: SpanFormState = {
  name: '',
  span_type: '',
  sub_type: '',
  repeat: 0,
  type: 'span',
};

const SpanForm = ({
  formId,
  onClose,
  onSave,
  onEdit,
}: {
  formId: string;
  onClose: () => void;
  onSave: (payload: SpanFormState) => void;
  onEdit: (payload: SpanFormState, id: string) => void;
}) => {
  const { state } = useScenarioContext();
  const [isInvalid, setIsInvalid] = React.useState<InvalidType>({
    name: false,
    span_type: false,
    sub_type: false,
  });

  let computedState = INITIAL_STATE;

  if (state.modalForm.isEdit) {
    const existingSpan = findNodeInATree(state.modalForm.id, state.entryTransaction);
    if (existingSpan?.docType === 'span') {
      computedState = {
        name: existingSpan.name,
        span_type: existingSpan.type,
        sub_type: existingSpan.subtype,
        repeat: existingSpan.repeat || 0,
        type: 'span',
      };
    }
  }

  const [formState, setFormState] = React.useState<SpanFormState>(computedState);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value?.length) {
      setIsInvalid({ ...isInvalid, [name]: false });
    }
    if (name === 'repeat') {
      setFormState({ ...formState, [name]: parseInt(value, 10) });
    } else {
      setFormState({ ...formState, [name]: value });
    }
  };

  const onSaveClick = () => {
    if (formState.name === '') {
      setIsInvalid({ ...isInvalid, name: true });
    } else if (formState.span_type === '') {
      setIsInvalid({ ...isInvalid, span_type: true });
    } else if (formState.sub_type === '') {
      setIsInvalid({ ...isInvalid, sub_type: true });
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
          {state.modalForm.isEdit ? 'Edit Span' : 'Create Span'}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm id={formId} component="form">
          <EuiFormRow label="Span Name" isInvalid={isInvalid.name} error="Name is mandatory">
            <EuiFieldText
              name="name"
              isInvalid={isInvalid.name}
              value={formState.name}
              onChange={onChange}
            />
          </EuiFormRow>

          <EuiFormRow label="Type" isInvalid={isInvalid.span_type} error="Type is mandatory">
            <EuiFieldText
              name="span_type"
              isInvalid={isInvalid.span_type}
              value={formState.span_type}
              onChange={onChange}
            />
          </EuiFormRow>

          <EuiFormRow label="Sub-Type" isInvalid={isInvalid.sub_type} error="Sub-type is mandatory">
            <EuiFieldText
              name="sub_type"
              isInvalid={isInvalid.sub_type}
              value={formState.sub_type}
              onChange={onChange}
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

export default SpanForm;
