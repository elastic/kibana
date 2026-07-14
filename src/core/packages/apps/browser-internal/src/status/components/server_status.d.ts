import type { FunctionComponent } from 'react';
import type { StatusState } from '../lib';
interface ServerStateProps {
    name?: string;
    serverState: StatusState;
}
export declare const ServerStatus: FunctionComponent<ServerStateProps>;
export {};
