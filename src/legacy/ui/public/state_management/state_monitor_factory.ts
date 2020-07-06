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
import { cloneDeep, isEqual, isPlainObject, set } from 'lodash';
import { State } from './state';

export const stateMonitorFactory = {
  create: <TStateDefault extends { [key: string]: unknown }>(
    state: State,
    customInitialState: TStateDefault
  ) => stateMonitor<TStateDefault>(state, customInitialState),
};

interface StateStatus {
  clean: boolean;
  dirty: boolean;
}

export interface StateMonitor<TStateDefault extends { [key: string]: unknown }> {
  setInitialState: (innerCustomInitialState: TStateDefault) => void;
  ignoreProps: (props: string[] | string) => void;
  onChange: (callback: ChangeHandlerFn) => StateMonitor<TStateDefault>;
  destroy: () => void;
}

type ChangeHandlerFn = (status: StateStatus, type: string | null, keys: string[]) => void;

function stateMonitor<TStateDefault extends { [key: string]: unknown }>(
  state: State,
  customInitialState: TStateDefault
): StateMonitor<TStateDefault> {
  let destroyed = false;
  let ignoredProps: string[] = [];
  let changeHandlers: ChangeHandlerFn[] | undefined = [];
  let initialState: TStateDefault;

  setInitialState(customInitialState);

  function setInitialState(innerCustomInitialState: TStateDefault) {
    // state.toJSON returns a reference, clone so we can mutate it safely
    initialState = cloneDeep(innerCustomInitialState) || cloneDeep(state.toJSON());
  }

  function removeIgnoredProps(innerState: TStateDefault) {
    ignoredProps.forEach((path) => {
      set(innerState, path, true);
    });
    return innerState;
  }

  function getStatus(): StateStatus {
    // state.toJSON returns a reference, clone so we can mutate it safely
    const currentState = removeIgnoredProps(cloneDeep(state.toJSON()));
    const isClean = isEqual(currentState, initialState);

    return {
      clean: isClean,
      dirty: !isClean,
    };
  }

  function dispatchChange(type: string | null = null, keys: string[] = []) {
    const status = getStatus();
    if (!changeHandlers) {
      throw new Error('Change handlers is undefined, this object has been destroyed');
    }
    changeHandlers.forEach((changeHandler) => {
      changeHandler(status, type, keys);
    });
  }

  function dispatchFetch(keys: string[]) {
    dispatchChange('fetch_with_changes', keys);
  }

  function dispatchSave(keys: string[]) {
    dispatchChange('save_with_changes', keys);
  }

  function dispatchReset(keys: string[]) {
    dispatchChange('reset_with_changes', keys);
  }

  return {
    setInitialState(innerCustomInitialState: TStateDefault) {
      if (!isPlainObject(innerCustomInitialState)) {
        throw new TypeError('The default state must be an object');
      }

      // check the current status
      const previousStatus = getStatus();

      // update the initialState and apply ignoredProps
      setInitialState(innerCustomInitialState);
      removeIgnoredProps(initialState);

      // fire the change handler if the status has changed
      if (!isEqual(previousStatus, getStatus())) {
        dispatchChange();
      }
    },

    ignoreProps(props: string[] | string) {
      ignoredProps = ignoredProps.concat(props);
      removeIgnoredProps(initialState);
      return this;
    },

    onChange(callback: ChangeHandlerFn) {
      if (destroyed || !changeHandlers) {
        throw new Error('Monitor has been destroyed');
      }
      if (typeof callback !== 'function') {
        throw new Error('onChange handler must be a function');
      }

      changeHandlers.push(callback);

      // Listen for state events.
      state.on('fetch_with_changes', dispatchFetch);
      state.on('save_with_changes', dispatchSave);
      state.on('reset_with_changes', dispatchReset);

      // if the state is already dirty, fire the change handler immediately
      const status = getStatus();
      if (status.dirty) {
        dispatchChange();
      }

      return this;
    },

    destroy() {
      destroyed = true;
      changeHandlers = undefined;
      state.off('fetch_with_changes', dispatchFetch);
      state.off('save_with_changes', dispatchSave);
      state.off('reset_with_changes', dispatchReset);
    },
  };
}
