import { EuiButtonEmpty, EuiCard, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import { useScenarioContext } from '../../context/use_scenario_context';
import { AgentIcon } from '../agent_icon';

export function ScenarioView() {
  const { state } = useScenarioContext();
  console.log('### caue  ScenarioView  state', state);
  const { service } = state;
  const { children } = service || {};
  if (!service || !children) {
    return null;
  }

  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiCard
            icon={<AgentIcon agentName={service.agentName} size="xxl" />}
            // At this point we should already have one child defined in the top transaction
            title={children[0].name}
            footer={
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiButtonEmpty iconType="plusInCircle"></EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButtonEmpty iconType="gear"></EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
