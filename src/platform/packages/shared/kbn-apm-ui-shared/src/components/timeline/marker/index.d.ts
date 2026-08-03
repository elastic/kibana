import React from 'react';
import type { AgentMark } from './agent_marker';
import type { ErrorMark } from './error_marker';
export interface Mark {
    type: string;
    offset: number;
    verticalLine: boolean;
    id: string;
}
interface Props {
    mark: ErrorMark | AgentMark;
    x: number;
}
export declare function Marker({ mark, x }: Props): React.JSX.Element;
export {};
