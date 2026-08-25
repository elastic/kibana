/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AgentIcon } from '@kbn/custom-icons';
import type { AgentName } from '@kbn/elastic-agent-utils';
import React from 'react';

interface Props {
  agentName?: string;
  serviceName: string | React.ReactNode;
}

export function ServiceNameWithIcon({ agentName, serviceName }: Props) {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {agentName && (
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={agentName as AgentName} size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>{serviceName}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
