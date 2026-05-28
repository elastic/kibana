import type { StateComparators, StateManager, WithAllKeys } from './types';
/**
 * Initializes a composable state manager instance for a given state type.
 * @param initialState - The initial state of the state manager.
 * @param defaultState - The default state of the state manager. Every key in this state must be present, for optional keys specify undefined explicly.
 * @param comparators - Optional StateComparators. When provided, subject will only emit when value changes.
 */
export declare const initializeStateManager: <StateType extends object>(initialState: Partial<StateType>, defaultState: WithAllKeys<StateType>, comparators?: StateComparators<StateType>) => StateManager<StateType>;
