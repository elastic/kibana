import React from 'react';

import Branch from './branch';
import { useScenarioContext } from '../../context/use_scenario_context';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

export const ScenarioViewWaterfall = () => {
  const { state } = useScenarioContext();
  const { items } = state;
  const { children } = items || {};
  if (!items || !children) {
    return null;
  }

  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <Branch key={items.id} item={items} level={0} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
