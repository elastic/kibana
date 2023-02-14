import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiText } from '@elastic/eui';
import React from 'react';
import { Span, Service, Transaction } from '../../typings';
import { AgentIcon } from '../agent_icon';

const Node = ({
  item,
  hasChildren,
  level,
}: {
  item: Transaction | Span | Service;
  hasChildren: boolean;
  level: number;
}) => {
  const shouldDisplayActions = !(item as Service).agentName;
  return (
    <EuiFlexGroup>
      {!shouldDisplayActions && (
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={(item as Service).agentName} size="l" />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText style={{ display: 'flex', paddingLeft: `${level * 30}px` }}>{item.name}</EuiText>
      </EuiFlexItem>
      {shouldDisplayActions && (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon onClick={() => {}} iconType="plus" aria-label="Add" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon onClick={() => {}} iconType="gear" aria-label="Add" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
};

export default Node;
