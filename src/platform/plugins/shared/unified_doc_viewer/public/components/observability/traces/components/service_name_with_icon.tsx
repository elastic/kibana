/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { AgentIcon } from '@kbn/custom-icons';
import { AgentName } from '@kbn/elastic-agent-utils';

interface Props {
  agentName: string;
  formattedServiceName: React.ReactNode;
}

export function ServiceNameWithIcon({ agentName, formattedServiceName }: Props) {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      {agentName && (
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={agentName as AgentName} size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>{formattedServiceName}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
// eslint-disable-next-line import/no-default-export
export default ServiceNameWithIcon;
