/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoveredPlugin } from '@kbn/core-base-common';
import { InjectedMetadataService } from './injected_metadata_service';
import type { InjectedMetadataParams } from '..';

describe('setup.getElasticsearchInfo()', () => {
  it('returns elasticsearch info from injectedMetadata', () => {
    const setup = new InjectedMetadataService({
      injectedMetadata: {
        clusterInfo: {
          cluster_uuid: 'foo',
          cluster_name: 'cluster_name',
          cluster_version: 'version',
        },
      },
    } as any).setup();

    expect(setup.getElasticsearchInfo()).toEqual({
      cluster_uuid: 'foo',
      cluster_name: 'cluster_name',
      cluster_version: 'version',
    });
  });

  it('returns elasticsearch info as undefined if not present in the injectedMetadata', () => {
    const setup = new InjectedMetadataService({
      injectedMetadata: {
        clusterInfo: {},
      },
    } as any).setup();

    expect(setup.getElasticsearchInfo()).toEqual({});
  });
});

describe('setup.getKibanaBuildNumber()', () => {
  it('returns buildNumber from injectedMetadata', () => {
    const setup = new InjectedMetadataService({
      injectedMetadata: {
        buildNumber: 'foo',
      },
    } as any).setup();

    expect(setup.getKibanaBuildNumber()).toBe('foo');
  });
});

describe('setup.getCspConfig()', () => {
  it('returns injectedMetadata.csp', () => {
    const setup = new InjectedMetadataService({
      injectedMetadata: {
        csp: {
          warnLegacyBrowsers: true,
        },
      },
    } as any).setup();

    expect(setup.getCspConfig()).toEqual({
      warnLegacyBrowsers: true,
    });
  });

  it('csp config is frozen', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {
        csp: {
          warnLegacyBrowsers: true,
        },
      },
    } as any);

    const csp = injectedMetadata.setup().getCspConfig();
    expect(() => {
      csp.warnLegacyBrowsers = false;
    }).toThrowError();
  });
});

describe('setup.getPlugins()', () => {
  it('returns injectedMetadata.uiPlugins', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {
        uiPlugins: [
          { id: 'plugin-1', plugin: {}, config: { clientProp: 'clientValue' } },
          { id: 'plugin-2', plugin: {} },
        ],
      },
    } as any);

    const plugins = injectedMetadata.setup().getPlugins();
    expect(plugins).toEqual([
      { id: 'plugin-1', plugin: {}, config: { clientProp: 'clientValue' } },
      { id: 'plugin-2', plugin: {} },
    ]);
  });

  it('returns frozen version of uiPlugins', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {
        uiPlugins: [
          { id: 'plugin-1', plugin: {} },
          { id: 'plugin-2', plugin: {} },
        ],
      },
    } as any);

    const plugins = injectedMetadata.setup().getPlugins();
    expect(() => {
      plugins.pop();
    }).toThrowError();
    expect(() => {
      plugins.push({ id: 'new-plugin', plugin: {} as DiscoveredPlugin });
    }).toThrowError();
    expect(() => {
      // @ts-expect-error TS knows this shouldn't be possible
      plugins[0].name = 'changed';
    }).toThrowError();
    expect(() => {
      // @ts-expect-error TS knows this shouldn't be possible
      plugins[0].newProp = 'changed';
    }).toThrowError();
  });
});

describe('setup.getLegacyMetadata()', () => {
  it('returns injectedMetadata.legacyMetadata', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {
        legacyMetadata: 'foo',
      },
    } as any);

    const contract = injectedMetadata.setup();
    expect(contract.getLegacyMetadata()).toBe('foo');
  });

  it('exposes frozen version of legacyMetadata', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {
        legacyMetadata: {
          foo: true,
        },
      },
    } as any);

    const legacyMetadata = injectedMetadata.setup().getLegacyMetadata();
    expect(legacyMetadata).toEqual({
      foo: true,
    });
    expect(() => {
      // @ts-expect-error TS knows this shouldn't be possible
      legacyMetadata.foo = false;
    }).toThrowError();
  });
});

describe('setup.getFeatureFlags()', () => {
  it('returns injectedMetadata.featureFlags', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {
        featureFlags: {
          overrides: {
            'my-overridden-flag': 1234,
          },
        },
      },
    } as unknown as InjectedMetadataParams);

    const contract = injectedMetadata.setup();
    expect(contract.getFeatureFlags()).toStrictEqual({ overrides: { 'my-overridden-flag': 1234 } });
  });

  it('returns empty injectedMetadata.featureFlags', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {},
    } as unknown as InjectedMetadataParams);

    const contract = injectedMetadata.setup();
    expect(contract.getFeatureFlags()).toBeUndefined();
  });
});
