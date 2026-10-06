import type { Logger } from '@kbn/logging';
import type { MigrationLog } from '../../types';
export interface LogAwareState {
    controlState: string;
    logs: MigrationLog[];
}
export declare const logStateTransition: (logger: Logger, logPrefix: string, prevState: LogAwareState, currState: LogAwareState, tookMs: number) => void;
export declare const logActionResponse: (logger: Logger, logMessagePrefix: string, state: LogAwareState, res: unknown) => void;
