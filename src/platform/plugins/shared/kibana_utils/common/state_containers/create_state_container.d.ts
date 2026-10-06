import type { ReduxLikeStateContainer, BaseState } from './types';
export declare const defaultFreeze: <T>(value: T) => T;
/**
 * State container options
 * @public
 */
export interface CreateStateContainerOptions {
    /**
     * Function to use when freezing state. Supply identity function.
     * If not provided, default `deepFreeze` is used.
     *
     * @example
     * If you expect that your state will be mutated externally an you cannot
     * prevent that
     * ```ts
     * {
     *   freeze: state => state,
     * }
     * ```
     */
    freeze?: <T>(state: T) => T;
}
/**
 * Creates a state container without transitions and without selectors.
 * @param defaultState - initial state
 * @typeParam State - shape of state
 * @public
 */
export declare function createStateContainer<State extends BaseState>(defaultState: State): ReduxLikeStateContainer<State>;
/**
 * Creates a state container with transitions, but without selectors.
 * @param defaultState - initial state
 * @param pureTransitions - state transitions configuration object. Map of {@link PureTransition}.
 * @typeParam State - shape of state
 * @public
 */
export declare function createStateContainer<State extends BaseState, PureTransitions extends object>(defaultState: State, pureTransitions: PureTransitions): ReduxLikeStateContainer<State, PureTransitions>;
/**
 * Creates a state container with transitions and selectors.
 * @param defaultState - initial state
 * @param pureTransitions - state transitions configuration object. Map of {@link PureTransition}.
 * @param pureSelectors - state selectors configuration object. Map of {@link PureSelectors}.
 * @param options - state container options {@link CreateStateContainerOptions}
 * @typeParam State - shape of state
 * @public
 */
export declare function createStateContainer<State extends BaseState, PureTransitions extends object, PureSelectors extends object>(defaultState: State, pureTransitions: PureTransitions, pureSelectors: PureSelectors, options?: CreateStateContainerOptions): ReduxLikeStateContainer<State, PureTransitions, PureSelectors>;
