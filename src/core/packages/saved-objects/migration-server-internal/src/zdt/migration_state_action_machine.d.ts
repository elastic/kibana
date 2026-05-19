import type { Logger } from '@kbn/logging';
import { type Next } from '../state_action_machine';
import type { State } from './state';
import type { MigratorContext } from './context';
/**
 * A specialized migrations-specific state-action machine that:
 *  - logs messages in state.logs
 *  - logs state transitions
 *  - logs action responses
 *  - resolves if the final state is DONE
 *  - rejects if the final state is FATAL
 *  - catches and logs exceptions and then rejects with a migrations specific error
 */
export declare function migrationStateActionMachine({ initialState, context, next, model, logger, }: {
    initialState: State;
    context: MigratorContext;
    next: Next<State>;
    model: (state: State, res: any, context: MigratorContext) => State;
    logger: Logger;
}): Promise<{
    status: "patched";
    destIndex: string;
    elapsedMs: number;
}>;
