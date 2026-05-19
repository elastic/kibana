import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import type { AgentName } from '@kbn/elastic-agent-utils';
export interface AgentIconProps extends Omit<EuiIconProps, 'type'> {
    agentName?: AgentName;
}
export declare function AgentIcon({ agentName, size, ...props }: AgentIconProps): React.JSX.Element;
export default AgentIcon;
