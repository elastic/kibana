/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * State containers are Redux-store-like objects meant to help you manage state in your services or apps.
 * Refer to {@link https://github.com/elastic/kibana/tree/master/src/plugins/kibana_utils/docs/state_containers | guides and examples} for more info
 *
 * @packageDocumentation
 */

export {
  BaseState,
  BaseStateContainer,
  TransitionDescription,
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
} from './types';
export { createStateContainer, CreateStateContainerOptions } from './create_state_container';
export {
  createStateContainerReactHelpers,
  useContainerSelector,
  useContainerState,
} from './create_state_container_react_helpers';
