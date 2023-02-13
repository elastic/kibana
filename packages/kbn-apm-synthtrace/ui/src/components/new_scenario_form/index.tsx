import {
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSwitch,
} from '@elastic/eui';
import { useScenarioContext } from '../../context/use_scenario_context';
import type { ElasticAgentName } from '../../typings';
import { ServiceSelector } from '../service_selector';

const serviceOptions: Array<EuiComboBoxOptionOption<ElasticAgentName>> = [
  'go',
  'java',
  'js-base',
  'iOS/swift',
  'rum-js',
  'nodejs',
  'python',
  'dotnet',
  'ruby',
  'php',
  'android/java',
].map((agentName) => ({ key: agentName, label: agentName, value: agentName as ElasticAgentName }));

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
            value={state.service?.agentName}
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
