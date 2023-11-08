import { EuiFieldText, EuiForm, EuiFormRow, EuiPanel } from '@elastic/eui';
import React from 'react';
import { useScenarioContext } from '../../context/use_scenario_context';

export function Settings() {
  const { state, dispatch } = useScenarioContext();

  return (
    <EuiPanel>
      <EuiForm>
        <EuiFormRow label="Elasticsearch endpoint">
          <EuiFieldText
            value={state.credentials.esEndpoint}
            onChange={(e) => {
              dispatch({
                type: 'update_credentials',
                payload: { credentials: { ...state.credentials, esEndpoint: e.target.value } },
              });
            }}
          />
        </EuiFormRow>
        <EuiFormRow label="Kibana endpoint">
          <EuiFieldText
            value={state.credentials.kibanaEndpoint}
            onChange={(e) => {
              dispatch({
                type: 'update_credentials',
                payload: { credentials: { ...state.credentials, kibanaEndpoint: e.target.value } },
              });
            }}
          />
        </EuiFormRow>
      </EuiForm>
    </EuiPanel>
  );
}
