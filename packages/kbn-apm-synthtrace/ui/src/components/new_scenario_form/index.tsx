import { EuiComboBox, EuiSwitch } from '@elastic/eui';
import { useScenarioContext } from '../../context/use_scenario_context';

const serviceOptions = [
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
].map((agentName) => ({ key: agentName, label: agentName }));

export function NewScenarioForm() {
  const { state, dispatch } = useScenarioContext();

  return (
    <>
      <p>{JSON.stringify(state, null, 2)}</p>
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
      <EuiComboBox
        aria-label="Accessible screen reader label"
        placeholder="Select a single option"
        singleSelection={{ asPlainText: true }}
        options={serviceOptions}
        selectedOptions={[]}
        onChange={(newOption) => {
          console.log('### caue  NewScenarioForm  newOption', newOption);
        }}
      />
    </>
  );
}
