import { type AsyncState } from 'react-use/lib/useAsyncFn';
import type { CellAction, CellActionCompatibilityContext, GetActions } from '../types';
type AsyncActions<V = CellAction[]> = Omit<AsyncState<V>, 'error'>;
/**
 * Performs the getActions async call and returns its value
 */
export declare const useLoadActions: (context: CellActionCompatibilityContext, options?: LoadActionsOptions) => AsyncActions;
/**
 * Returns a function to perform the getActions async call
 */
export declare const useLoadActionsFn: (options?: LoadActionsOptions) => [AsyncActions, GetActions];
interface LoadActionsOptions {
    disabledActionTypes?: string[];
}
/**
 * Groups getActions calls for an array of contexts in one async bulk operation
 */
export declare const useBulkLoadActions: (contexts: CellActionCompatibilityContext[] | undefined, options?: LoadActionsOptions) => AsyncActions<CellAction[][]>;
export {};
