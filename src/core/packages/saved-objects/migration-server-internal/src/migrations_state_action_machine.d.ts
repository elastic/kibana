import type { Logger } from '@kbn/logging';
import type { MigrationResult } from '@kbn/core-saved-objects-base-server-internal';
import { type Model, type Next } from './state_action_machine';
import type { State } from './state';
/**
 * A specialized migrations-specific state-action machine that:
 *  - logs messages in state.logs
 *  - logs state transitions
 *  - logs action responses
 *  - resolves if the final state is DONE
 *  - rejects if the final state is FATAL
 *  - catches and logs exceptions and then rejects with a migrations specific error
 */
export declare function migrationStateActionMachine({ initialState, logger, next, model, abort, }: {
    initialState: State;
    logger: Logger;
    next: Next<State>;
    model: Model<State>;
    abort: (state?: State) => Promise<void>;
}): Promise<MigrationResult>;
