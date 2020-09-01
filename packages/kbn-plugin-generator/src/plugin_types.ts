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

import Path from 'path';

import { REPO_ROOT } from '@kbn/dev-utils';

export interface PluginType {
  thirdParty: boolean;
  installDir: string;
}

export const PLUGIN_TYPE_OPTIONS: Array<{ name: string; value: PluginType }> = [
  {
    name: 'Installable plugin',
    value: { thirdParty: true, installDir: Path.resolve(REPO_ROOT, 'plugins') },
  },
  {
    name: 'Kibana Example',
    value: { thirdParty: false, installDir: Path.resolve(REPO_ROOT, 'examples') },
  },
  {
    name: 'Kibana OSS',
    value: { thirdParty: false, installDir: Path.resolve(REPO_ROOT, 'src/plugins') },
  },
  {
    name: 'Kibana OSS Functional Testing',
    value: {
      thirdParty: false,
      installDir: Path.resolve(REPO_ROOT, 'test/plugin_functional/plugins'),
    },
  },
  {
    name: 'X-Pack',
    value: { thirdParty: false, installDir: Path.resolve(REPO_ROOT, 'x-pack/plugins') },
  },
  {
    name: 'X-Pack Functional Testing',
    value: {
      thirdParty: false,
      installDir: Path.resolve(REPO_ROOT, 'x-pack/test/plugin_functional/plugins'),
    },
  },
];
