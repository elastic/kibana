/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
