import type { ExcludeRetryableEsError } from '../../model/types';
import type { MigratorContext } from '../context';
import type { AllActionStates, AllControlStates, StateFromActionState, StateFromControlState } from '../state';
import type { ResponseType } from '../next';
/**
 * Utility type used to define the input of stage functions
 */
export type StateActionResponse<T extends AllActionStates> = ExcludeRetryableEsError<ResponseType<T>>;
/**
 * Defines a stage delegation function for the model
 */
export type ModelStage<T extends AllActionStates, R extends AllControlStates> = (state: StateFromActionState<T>, res: StateActionResponse<T>, context: MigratorContext) => StateFromControlState<T | R>;
