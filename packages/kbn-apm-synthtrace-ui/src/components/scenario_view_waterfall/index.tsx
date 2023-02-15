import Branch from './branch';
import { useScenarioContext } from '../../context/use_scenario_context';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';

export const ScenarioViewWaterfall = () => {
  const { state } = useScenarioContext();
  const { service } = state;
  const { children } = service || {};
  if (!service || !children) {
    return null;
  }

  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <Branch key={service.name} item={service} level={0} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
