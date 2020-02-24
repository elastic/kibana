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

import { ActionDefinition } from '../../actions';

interface Config {
  url: string;
  openInNewTab: boolean;
}

export const SAMPLE_GO_TO_URL_ACTION = 'SAMPLE_GO_TO_URL_ACTION';

export const createSampleGoToUrlAction = (): ActionDefinition<object, void, Config> => {
  return {
    id: SAMPLE_GO_TO_URL_ACTION,
    execute() {},
  };
};
