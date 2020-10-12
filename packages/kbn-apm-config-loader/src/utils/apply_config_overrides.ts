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

import { set } from '@elastic/safer-lodash-set';
import { getArgValue } from './read_argv';

/**
 * Manually applies the specific configuration overrides we need to load the APM config.
 * Currently, only these are needed:
 *   - server.uuid
 *   - path.data
 */
export const applyConfigOverrides = (config: Record<string, any>, argv: string[]) => {
  const serverUuid = getArgValue(argv, '--server.uuid');
  if (serverUuid) {
    set(config, 'server.uuid', serverUuid);
  }
  const dataPath = getArgValue(argv, '--path.data');
  if (dataPath) {
    set(config, 'path.data', dataPath);
  }
};
