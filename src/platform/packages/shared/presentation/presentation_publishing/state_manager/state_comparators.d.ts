import type { StateComparators } from './types';
export declare const runComparator: <StateType extends object = object>(comparator: StateComparators<StateType>[keyof StateType], lastSavedState?: Partial<StateType>, latestState?: Partial<StateType>, lastSavedValue?: StateType[keyof StateType], latestValue?: StateType[keyof StateType]) => boolean;
/**
 * Run all comparators, and return an object containing only the keys that are not equal, set to the value of the latest state
 */
export declare const diffComparators: <StateType extends object = object>(comparators: StateComparators<StateType>, lastSavedState?: Partial<StateType>, latestState?: Partial<StateType>, defaultState?: Partial<StateType>) => Partial<StateType>;
/**
 * Run comparators until at least one returns false
 */
export declare const areComparatorsEqual: <StateType extends object = object>(comparators: StateComparators<StateType>, lastSavedState?: StateType, currentState?: StateType, defaultState?: Partial<StateType>, getCustomLogLabel?: (key: string) => string) => boolean;
