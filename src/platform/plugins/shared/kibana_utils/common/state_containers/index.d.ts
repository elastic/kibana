/**
 * State containers are Redux-store-like objects meant to help you manage state in your services or apps.
 * Refer to {@link https://github.com/elastic/kibana/tree/main/src/platform/plugins/shared/kibana_utils/docs/state_containers | guides and examples} for more info
 *
 * @packageDocumentation
 */
export type { BaseState, BaseStateContainer, StateContainer, ReduxLikeStateContainer, Dispatch, Middleware, Selector, Comparator, MapStateToProps, Connect, Reducer, UnboxState, PureSelectorToSelector, PureSelectorsToSelectors, EnsurePureSelector, PureTransitionsToTransitions, PureTransitionToTransition, EnsurePureTransition, PureSelector, PureTransition, Transition, TransitionDescription, } from './types';
export type { CreateStateContainerOptions } from './create_state_container';
export { createStateContainer, defaultFreeze } from './create_state_container';
export { createStateContainerReactHelpers, useContainerSelector, useContainerState, } from './create_state_container_react_helpers';
