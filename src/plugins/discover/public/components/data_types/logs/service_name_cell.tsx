/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { dynamic } from '@kbn/shared-ux-utility';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import React from 'react';
import { getFieldValue } from '@kbn/discover-utils';
import { AGENT_NAME_FIELD } from '../../../../common/data_types/logs/constants';

const dataTestSubj = 'serviceNameCell';
const AgentIcon = dynamic(() => import('@kbn/custom-icons/src/components/agent_icon'));

export const getServiceNameCell =
  (serviceNameField: string) => (props: DataGridCellValueElementProps) => {
    const serviceNameValue = getFieldValue(props.row, serviceNameField);
    const agentName = getFieldValue(props.row, AGENT_NAME_FIELD) as AgentName;

    if (!serviceNameValue) {
      return <span data-test-subj={`${dataTestSubj}-empty`}>-</span>;
    }

    return (
      <EuiFlexGroup
        gutterSize="xs"
        data-test-subj={`${dataTestSubj}-${agentName || 'unknown'}`}
        responsive={false}
        alignItems="center"
      >
        <EuiFlexItem grow={false}>
          <EuiToolTip position="left" content={agentName} repositionOnScroll={true}>
            <AgentIcon agentName={agentName} size="m" />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{serviceNameValue}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };
