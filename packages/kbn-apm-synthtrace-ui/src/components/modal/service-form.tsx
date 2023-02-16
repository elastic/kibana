import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBoxOptionOption,
  EuiForm,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import React from 'react';
import {
  ElasticAgentName,
  Service,
  ServiceSelectorSelectedOption,
} from '@kbn/apm-synthtrace-ui/src/typings';
import { ServiceNames } from '@kbn/apm-synthtrace-ui/src/common/constants';
import { useScenarioContext } from '@kbn/apm-synthtrace-ui/src/context/use_scenario_context';
import { ServiceSelector } from '@kbn/apm-synthtrace-ui/src/components/service_selector';

export type ServiceFormState = {
  name: string;
  agentName: ElasticAgentName;
  id: string;
  type: 'service';
};

const ServiceForm = ({
  formId,
  onClose,
  onSave,
}: {
  formId: string;
  onClose: () => void;
  onSave: (payload: ServiceFormState) => void;
}) => {
  const { state } = useScenarioContext();
  const [formState, setFormState] = React.useState<ServiceFormState>({
    name: '',
    agentName: 'java',
    id: '',
    type: 'service',
  });

  const [isInvalid, setIsInvalid] = React.useState(true);

  const newServiceOptions: Array<EuiComboBoxOptionOption<ElasticAgentName>> = ServiceNames.map(
    (agentName) => ({
      key: `new_service-${agentName}`,
      label: agentName,
      value: agentName as ElasticAgentName,
    })
  );

  const existingServiceOptions: Array<EuiComboBoxOptionOption<ElasticAgentName>> = Object.values(
    state.services || {}
  ).map((service: Service) => ({
    key: service.id,
    label: service.name,
    value: service.agentName as ElasticAgentName,
  }));

  const allOptions = [
    { label: 'Link to Existing Service', options: existingServiceOptions },
    { label: 'New Service', options: newServiceOptions },
  ];

  const onOptionSelected = (formState: ServiceSelectorSelectedOption) => {
    setFormState((prevState) => ({
      ...prevState,
      id: formState.key,
      agentName: formState.value,
      name: `synth-${formState.value}`,
    }));
    setIsInvalid(false);
  };

  return (
    <EuiModal onClose={onClose} initialFocus="[name=name]">
      <EuiModalHeader>
        <EuiModalHeaderTitle>Create Service</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm id={formId} component="form">
          <ServiceSelector
            value={formState?.id}
            options={allOptions}
            optionType={'grouped'}
            onChange={onOptionSelected}
          />
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>

        <EuiButton
          type="submit"
          form={formId}
          onClick={() => onSave(formState)}
          fill
          disabled={isInvalid}
        >
          Save
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};

export default ServiceForm;
