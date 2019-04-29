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

export function __newPlatformSetup__(core: CoreSetup) {
  if (runtimeContext.setup.core) {
    throw new Error('New platform core api was already set up');
  }

  runtimeContext.setup.core = core;
}

export function __newPlatformStart__(core: CoreStart) {
  if (runtimeContext.start.core) {
    throw new Error('New platform core api was already started');
  }

  runtimeContext.start.core = core;
}

export function getNewPlatform() {
  if (runtimeContext.setup.core === null || runtimeContext.start.core === null) {
    throw new Error('runtimeContext is not initialized yet');
  }

  return runtimeContext;
}
