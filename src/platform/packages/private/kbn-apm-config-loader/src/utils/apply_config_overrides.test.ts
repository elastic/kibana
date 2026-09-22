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

  it('overrides the `telemetry.metrics.enabled` when provided as a command line argument', () => {
    const config: Record<string, any> = {};
    const argv = ['--telemetry.metrics.enabled'];
    applyConfigOverrides(config, argv);
    expect(config.telemetry.metrics.enabled).toEqual(true);
  });

  it('coerces boolean string CLI values to proper booleans', () => {
    const config: Record<string, any> = {};
    const argv = ['--elastic.apm.active=false', '--telemetry.tracing.enabled=true'];
    applyConfigOverrides(config, argv);
    expect(config.elastic.apm.active).toBe(false);
    expect(config.telemetry.tracing.enabled).toBe(true);
  });

  it('coerces numeric string CLI values to proper numbers', () => {
    const config: Record<string, any> = {};
    const argv = ['--telemetry.tracing.sample_rate=0.5'];
    applyConfigOverrides(config, argv);
    expect(config.telemetry.tracing.sample_rate).toBe(0.5);
  });

  it('preserves non-boolean non-numeric string CLI values as strings', () => {
    const config: Record<string, any> = {};
    const argv = ['--telemetry.tracing.exporters=[{"http":{"url":"http://localhost:4318"}}]'];
    applyConfigOverrides(config, argv);
    expect(config.telemetry.tracing.exporters).toBe('[{"http":{"url":"http://localhost:4318"}}]');
  });
});
