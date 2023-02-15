import { EuiFieldText, EuiForm, EuiFormRow, EuiPanel, EuiSwitch } from '@elastic/eui';
import React from 'react';
import { useScenarioContext } from '../../context/use_scenario_context';
import { ServiceSelector } from '../service_selector';

export function NewScenarioForm() {
  const { state, dispatch } = useScenarioContext();

  return (
    <EuiPanel>
      <EuiForm component="form">
        <p>{JSON.stringify(state, null, 2)}</p>
        <EuiFormRow label="Instance">
          <EuiFieldText disabled value={state.instanceName} />
        </EuiFormRow>
        <EuiFormRow label="Environment">
          <EuiFieldText disabled value={state.environment} />
        </EuiFormRow>
        <EuiFormRow>
          <EuiSwitch
            label="Distributed tracing"
            checked={state.isDistributedTracing}
            onChange={() => {
              dispatch({
                type: 'toggle_distributed_tracing',
                payload: { isDistributedTracing: !state.isDistributedTracing },
              });
            }}
          />
        </EuiFormRow>
        <EuiFormRow label="Top level service">
          <ServiceSelector
            value={state.topLevelService?.agentName}
            onChange={(agentName) => {
              dispatch({
                type: 'change_top_level_service',
                payload: { agentName },
              });
            }}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiPanel>
  );
}
