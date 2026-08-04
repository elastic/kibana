import React from 'react';
import type { Mark } from '.';
export interface AgentMark extends Mark {
    type: 'agentMark';
}
interface Props {
    mark: AgentMark;
}
export declare function AgentMarker({ mark }: Props): React.JSX.Element;
export {};
