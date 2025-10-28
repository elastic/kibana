/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon, useEuiTheme } from '@elastic/eui';
import type { AgentName } from '@kbn/elastic-agent-utils';
import { getAgentIcon } from './get_agent_icon';

export interface AgentIconProps extends Omit<EuiIconProps, 'type'> {
  agentName?: AgentName;
}

export function AgentIcon({ agentName, size = 'l', ...props }: AgentIconProps) {
  const theme = useEuiTheme();
  const icon = getAgentIcon(agentName, theme.colorMode === 'DARK');

  return <EuiIcon type={icon} size={size} title={agentName} {...props} />;
}

// eslint-disable-next-line import/no-default-export
export default AgentIcon;
