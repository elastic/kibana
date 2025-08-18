/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiTextTruncate } from '@elastic/eui';
import { AgentIcon } from '@kbn/custom-icons';
import React from 'react';
import { AgentName } from '@kbn/elastic-agent-utils';

interface Props {
  agentName?: string;
  serviceName: string | React.ReactNode;
  truncate?: boolean;
}

export function ServiceNameWithIcon({ agentName, serviceName, truncate = false }: Props) {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      {agentName && (
        <EuiFlexItem grow={false}>
          <AgentIcon agentName={agentName as AgentName} size="m" />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        {typeof serviceName === 'string' && truncate ? (
          <EuiTextTruncate data-test-subj="truncatedServiceName" text={serviceName} />
        ) : (
          serviceName
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
