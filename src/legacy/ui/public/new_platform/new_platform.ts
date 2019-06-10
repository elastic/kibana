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
import { InternalCoreSetup, InternalCoreStart } from '../../../../core/public';

export const npSetup = {
  core: (null as unknown) as InternalCoreSetup,
  plugins: {} as Record<string, unknown>,
};

export const npStart = {
  core: (null as unknown) as InternalCoreStart,
  plugins: {} as Record<string, unknown>,
};

/**
 * Only used by unit tests
 * @internal
 */
export function __reset__() {
  npSetup.core = (null as unknown) as InternalCoreSetup;
  npStart.core = (null as unknown) as InternalCoreStart;
}

export function __setup__(coreSetup: InternalCoreSetup) {
  npSetup.core = coreSetup;
}

export function __start__(coreStart: InternalCoreStart) {
  npStart.core = coreStart;
}
