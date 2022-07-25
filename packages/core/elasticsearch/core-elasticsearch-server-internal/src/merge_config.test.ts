/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { mergeConfig } from './merge_config';
import { configSchema, ElasticsearchConfig } from './elasticsearch_config';

const partialToConfig = (parts: Partial<ElasticsearchClientConfig>): ElasticsearchClientConfig => {
  return parts as ElasticsearchClientConfig;
};

describe('mergeConfig', () => {
  it('merges the base config and the overrides', () => {
    const base = partialToConfig({
      hosts: ['localhost'],
      compression: true,
    });
    const overrides: Partial<ElasticsearchClientConfig> = {
      maxSockets: 42,
    };

    expect(mergeConfig(base, overrides)).toEqual({
      hosts: ['localhost'],
      compression: true,
      maxSockets: 42,
    });
  });

  it('properly override values that are present in both the base config and the overrides', () => {
    const base = partialToConfig({
      hosts: ['localhost'],
      compression: true,
    });
    const overrides: Partial<ElasticsearchClientConfig> = {
      compression: false,
      maxSockets: 42,
    };

    expect(mergeConfig(base, overrides)).toEqual({
      hosts: ['localhost'],
      compression: false,
      maxSockets: 42,
    });
  });

  it('fully override arrays instead of aggregating them', () => {
    const base = partialToConfig({
      hosts: ['localhost'],
    });
    const overrides: Partial<ElasticsearchClientConfig> = {
      hosts: ['another-host'],
    };

    expect(mergeConfig(base, overrides)).toEqual({
      hosts: ['another-host'],
    });
  });

  it('ignores the `username` and `password` fields from the base config if overrides defines `serviceAccountToken`', () => {
    const base = partialToConfig({
      hosts: ['localhost'],
      username: 'foo',
      password: 'bar',
    });
    const overrides: Partial<ElasticsearchClientConfig> = {
      hosts: ['another-host'],
      serviceAccountToken: 'token',
    };

    expect(mergeConfig(base, overrides)).toEqual({
      hosts: ['another-host'],
      serviceAccountToken: 'token',
    });
  });

  it('ignores the `serviceAccountToken` field from the base config if overrides defines `username` and `password`', () => {
    const base = partialToConfig({
      hosts: ['localhost'],
      serviceAccountToken: 'token',
    });
    const overrides: Partial<ElasticsearchClientConfig> = {
      hosts: ['another-host'],
      username: 'foo',
      password: 'bar',
    };

    expect(mergeConfig(base, overrides)).toEqual({
      hosts: ['another-host'],
      username: 'foo',
      password: 'bar',
    });
  });

  it('does not mutate the base config', () => {
    const base = partialToConfig({
      hosts: ['localhost'],
      maxSockets: 42,
    });
    const overrides: Partial<ElasticsearchClientConfig> = {
      hosts: ['another-host'],
      maxSockets: 9000,
      compression: true,
    };

    mergeConfig(base, overrides);

    expect(base).toEqual({
      hosts: ['localhost'],
      maxSockets: 42,
    });
  });

  it('works with a real instance of ElasticsearchConfig', () => {
    const rawConfig = configSchema.validate({
      username: 'foo',
      password: 'bar',
    });

    const baseConfig = new ElasticsearchConfig(rawConfig);

    const overrides: Partial<ElasticsearchClientConfig> = {
      serviceAccountToken: 'token',
    };

    const output = mergeConfig(baseConfig, overrides);

    expect(output.serviceAccountToken).toEqual('token');
    expect(output.username).toBeUndefined();
    expect(output.password).toBeUndefined();
  });
});
