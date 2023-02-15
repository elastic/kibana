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

const SpanForm = ({
  formId,
  onClose,
  onSave,
}: {
  formId: string;
  onClose: () => void;
  onSave: (payload: SpanFormState) => void;
}) => {
  const [isInvalid, setIsInvalid] = React.useState<InvalidType>({
    name: false,
    span_type: false,
    sub_type: false,
  });

  const [formState, setFormState] = React.useState<SpanFormState>({
    name: '',
    span_type: '',
    sub_type: '',
    repeat: 0,
    type: 'span',
  });

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
      onSave(formState);
    }
  };

  return (
    <EuiModal onClose={onClose} initialFocus="[name=name]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>Create Span</EuiModalHeaderTitle>
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
            <EuiFieldText name="repeat" value={formState.repeat} onChange={onChange} />
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

export default SpanForm;
