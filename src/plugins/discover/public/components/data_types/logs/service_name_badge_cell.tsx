/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import React from 'react';
import { AGENT_NAME_FIELD } from '../../../../common/data_types/logs/constants';

const dataTestSubj = 'serviceNameBadgeCell';
const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

export const getServiceNameBadgeCell =
  (serviceNameField: string) => (props: DataGridCellValueElementProps) => {
    const serviceNameValue = props.row.flattened[serviceNameField];
    const agentNameValue = props.row.flattened[AGENT_NAME_FIELD];

    if (!serviceNameValue) {
      return null;
    }

    const agentName = (
      Array.isArray(agentNameValue) ? agentNameValue[0] : agentNameValue
    ) as AgentName;

    return (
      <EuiFlexGroup gutterSize="xs" data-test-subj={`${dataTestSubj}-${agentName || 'unknown'}`}>
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={agentName} size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs">{serviceNameValue}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };
