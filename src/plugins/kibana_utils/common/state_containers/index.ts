/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * State containers are Redux-store-like objects meant to help you manage state in your services or apps.
 * Refer to {@link https://github.com/elastic/kibana/tree/main/src/plugins/kibana_utils/docs/state_containers | guides and examples} for more info
 *
 * @packageDocumentation
 */

export type {
  BaseState,
  BaseStateContainer,
  StateContainer,
  ReduxLikeStateContainer,
  Dispatch,
  Middleware,
  Selector,
  Comparator,
  MapStateToProps,
  Connect,
  Reducer,
  UnboxState,
  PureSelectorToSelector,
  PureSelectorsToSelectors,
  EnsurePureSelector,
  PureTransitionsToTransitions,
  PureTransitionToTransition,
  EnsurePureTransition,
  PureSelector,
  PureTransition,
  Transition,
  TransitionDescription,
} from './types';

export type { CreateStateContainerOptions } from './create_state_container';

export { createStateContainer } from './create_state_container';

export {
  createStateContainerReactHelpers,
  useContainerSelector,
  useContainerState,
} from './create_state_container_react_helpers';
