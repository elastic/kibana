import {
  EuiButton,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPanel,
} from '@elastic/eui';
import React from 'react';
import { useScenarioContext } from '../../context/use_scenario_context';
import { ServiceSelector } from '../service_selector';
import { ServiceNames } from '../../common/constants';
import {
  ElasticAgentName,
  ServiceSelectorSelectedOption,
} from '@kbn/apm-synthtrace-ui/src/typings';

export function NewScenarioForm() {
  const { state, dispatch } = useScenarioContext();

  const serviceOptions: Array<EuiComboBoxOptionOption<ElasticAgentName>> = ServiceNames.map(
    (agentName) => ({
      key: agentName,
      label: agentName,
      value: agentName as ElasticAgentName,
    })
  );

  return (
    <EuiPanel>
      <EuiForm component="form">
        <EuiFormRow label="Instance">
          <EuiFieldText disabled value={state.instanceName} />
        </EuiFormRow>
        <EuiFormRow label="Environment">
          <EuiFieldText disabled value={state.environment} />
        </EuiFormRow>
        <EuiFormRow label="Top level service">
          <ServiceSelector
            value={state.topLevelService?.agentName}
            options={serviceOptions}
            optionType={'single'}
            onChange={(selectedAgent: ServiceSelectorSelectedOption) => {
              dispatch({
                type: 'change_top_level_service',
                payload: { agentName: selectedAgent.value },
              });
            }}
          />
        </EuiFormRow>
        <EuiButton
          onClick={() => {
            dispatch({ type: 'clean_scenario' });
          }}
        >
          Reset scenario
        </EuiButton>
      </EuiForm>
    </EuiPanel>
  );
}
