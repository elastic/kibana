import React from 'react';

import Branch from './branch';
import { useScenarioContext } from '../../context/use_scenario_context';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { useState } from 'react';
import axios from 'axios';

export const ScenarioViewWaterfall = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { state } = useScenarioContext();
  const { entryTransaction } = state;
  const { children } = entryTransaction || {};
  if (!entryTransaction || !children) {
    return null;
  }

  async function runScenario() {
    setIsLoading(true);
    try {
      const resp = await axios.get('http://localhost:3000/api/ping');
      console.log('### caue  runScenario  resp', resp);
    } catch (e) {
      console.log('### caue  runScenario  e', e);
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
