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
import { CoreSetup, CoreStart } from '../../../../core/public';

const runtimeContext = {
  setup: {
    core: (null as unknown) as CoreSetup,
    plugins: {},
  },
  start: {
    core: (null as unknown) as CoreStart,
    plugins: {},
  },
};

/**
 * Only used by unit tests
 * @internal
 */
export function __reset__() {
  runtimeContext.setup.core = (null as unknown) as CoreSetup;
  runtimeContext.start.core = (null as unknown) as CoreStart;
}

export async function __newPlatformSetup__(core: CoreSetup) {
  if (runtimeContext.setup.core) {
    throw new Error('New platform core api was already set up');
  }

  runtimeContext.setup.core = core;

  // Process any pending onSetup callbacks
  while (onSetupCallbacks.length) {
    const cb = onSetupCallbacks.shift()!;
    await cb(runtimeContext.setup);
  }
}

export async function __newPlatformStart__(core: CoreStart) {
  if (runtimeContext.start.core) {
    throw new Error('New platform core api was already started');
  }

  runtimeContext.start.core = core;

  // Process any pending onStart callbacks
  while (onStartCallbacks.length) {
    const cb = onStartCallbacks.shift()!;
    await cb(runtimeContext.start);
  }
}

export function getNewPlatform() {
  if (runtimeContext.setup.core === null || runtimeContext.start.core === null) {
    throw new Error('runtimeContext is not initialized yet');
  }

  return runtimeContext;
}

type SetupCallback<T> = (startContext: typeof runtimeContext['setup']) => T;
type StartCallback<T> = (startContext: typeof runtimeContext['start']) => T;

const onSetupCallbacks: Array<SetupCallback<Promise<unknown>>> = [];
const onStartCallbacks: Array<StartCallback<Promise<unknown>>> = [];

/**
 * Register a callback to be called once the new platform is in the
 * `setup` lifecycle event. Resolves to the return value of the callback.
 */
export async function onSetup<T>(callback: SetupCallback<T>): Promise<T> {
  if (runtimeContext.setup.core !== null) {
    return callback(runtimeContext.setup);
  }

  return new Promise((resolve, reject) => {
    onSetupCallbacks.push(async (setupContext: typeof runtimeContext['setup']) => {
      try {
        resolve(await callback(setupContext));
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Register a callback to be called once the new platform is in the
 * `start` lifecycle event. Resolves to the return value of the callback.
 */
export async function onStart<T>(callback: StartCallback<T>): Promise<T> {
  if (runtimeContext.start.core !== null) {
    return callback(runtimeContext.start);
  }

  return new Promise((resolve, reject) => {
    onStartCallbacks.push(async (startContext: typeof runtimeContext['start']) => {
      try {
        resolve(await callback(startContext));
      } catch (e) {
        reject(e);
      }
    });
  });
}
