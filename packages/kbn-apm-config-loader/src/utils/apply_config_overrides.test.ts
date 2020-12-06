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

import { applyConfigOverrides } from './apply_config_overrides';

describe('applyConfigOverrides', () => {
  it('overrides `server.uuid` when provided as a command line argument', () => {
    const config: Record<string, any> = {
      server: {
        uuid: 'from-config',
      },
    };
    const argv = ['--server.uuid', 'from-argv'];

    applyConfigOverrides(config, argv);

    expect(config.server.uuid).toEqual('from-argv');
  });

  it('overrides `path.data` when provided as a command line argument', () => {
    const config: Record<string, any> = {
      path: {
        data: '/from/config',
      },
    };
    const argv = ['--path.data', '/from/argv'];

    applyConfigOverrides(config, argv);

    expect(config.path.data).toEqual('/from/argv');
  });

  it('properly set the overridden properties even if the parent object is not present in the config', () => {
    const config: Record<string, any> = {};
    const argv = ['--server.uuid', 'from-argv', '--path.data', '/data-path'];

    applyConfigOverrides(config, argv);

    expect(config.server.uuid).toEqual('from-argv');
    expect(config.path.data).toEqual('/data-path');
  });
});
