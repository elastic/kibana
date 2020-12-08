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
export interface ControlState {
  controlState: string;
}

const MAX_STEPS_WITHOUT_CONTROL_STATE_CHANGE = 50;

/**
 * A state-action machine for performing Saved Object Migrations.
 *
 * Based on https://www.microsoft.com/en-us/research/uploads/prod/2016/12/Computation-and-State-Machines.pdf
 *
 * The state-action machine defines it's behaviour in steps. Each step is a
 * transition from a state s_i to the state s_i+1 caused by an action a_i.
 *
 * s_i   -> a_i -> s_i+1
 * s_i+1 -> a_i+1 -> s_i+2
 *
 * Given a state s1, `next(s1)` returns the next action to execute. Actions are
 * asynchronous, once the action resolves, we can use the action response to
 * determine the next state to transition to as defined by the function
 * `model(state, response)`.
 *
 * We can then loosely define a step as:
 * s_i+1 = model(s_i, await next(s_i)())
 *
 * When there are no more actions returned by `next` the state-action machine
 * terminates.
 *
 * @param initialState The initial state with which to start the state action
 * machine
 * @param next A function which given the current state, returns a thunk which
 * is the next action to perform. If next returns null the state action machine
 * terminates.
 * @param model A function which given the current state and the response of
 * the action thunk, returns a new state
 * @param onStepComplete A callback functions which is called after every
 * completed step
 */
export async function stateActionMachine<S extends ControlState>(
  initialState: S,
  // It would be nice to use generics to enforce that model should accept all
  // the types of responses that actions could return. But seems to be
  // impossible because of https://github.com/microsoft/TypeScript/issues/13995#issuecomment-477978591
  next: (state: S) => (() => Promise<unknown>) | null,
  model: (state: S, res: any) => S
) {
  let state = initialState;
  let controlStateStepCounter = 0;
  let nextAction = next(state);

  while (nextAction != null) {
    // Perform the action that triggers the next step
    const actionResponse = await nextAction();
    const newState = model(state, actionResponse);

    controlStateStepCounter =
      newState.controlState === state.controlState ? controlStateStepCounter + 1 : 0;
    if (controlStateStepCounter >= MAX_STEPS_WITHOUT_CONTROL_STATE_CHANGE) {
      // This is just a fail-safe to ensure we don't get stuck in an infinite loop
      throw new Error(
        `Control state didn't change after ${MAX_STEPS_WITHOUT_CONTROL_STATE_CHANGE} steps aborting.`
      );
    }

    // Get ready for the next step
    state = newState;
    nextAction = next(state);
  }

  return state;
}
