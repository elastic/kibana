import React from 'react';

import Branch from './branch';
import { useScenarioContext } from '../../context/use_scenario_context';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSwitch,
} from '@elastic/eui';
import { useState } from 'react';
import axios from 'axios';
import { AxiosError } from 'axios';

interface Message {
  type: 'error' | 'success';
  message: string;
}

export const ScenarioViewWaterfall = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<Message | undefined>();
  const { state, dispatch } = useScenarioContext();
  const { entryTransaction } = state;
  const { children } = entryTransaction || {};
  if (!entryTransaction || !children) {
    return null;
  }

  async function runScenario() {
    setMessage(undefined);
    setIsLoading(true);
    try {
      await axios.post('http://localhost:3000/api/run_scenario', state);
      setMessage({
        type: 'success',
        message: 'Trace generated!',
      });
    } catch (e) {
      const err = e as AxiosError<{ error: string }>;
      setMessage({
        type: 'error',
        message: err.response?.data.error || 'Ups, something went wrong!',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <EuiPanel>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <Branch key={entryTransaction.id} item={entryTransaction} level={0} />
        </EuiFlexItem>
        <EuiHorizontalRule margin="s" />
        {message?.type === 'error' && (
          <EuiFlexItem>
            <EuiCallOut title="Sorry, there was an error 😢" color="danger" iconType="alert">
              <p>{message.message}</p>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        {message?.type === 'success' && (
          <EuiFlexItem>
            <EuiCallOut title="😎" color="success">
              <p>{message.message}</p>
            </EuiCallOut>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Clean APM indices on every run?"
            checked={state.cleanApmIndices}
            onChange={() => {
              dispatch({
                type: 'toggle_clean_apm_indices',
                payload: { cleanApmIndices: !state.cleanApmIndices },
              });
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            style={{ width: 100 }}
            iconType="play"
            onClick={runScenario}
            isLoading={isLoading}
          >
            Run
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
