import type { AllActionStates, State } from '../state';
import type { ResponseType } from '../next';
export declare const model: (currentState: State, resW: ResponseType<AllActionStates>) => State;
