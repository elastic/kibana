/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DiscoveredPlugin } from '../../server';
import { InjectedMetadataService } from './injected_metadata_service';

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

describe('setup.getInjectedVar()', () => {
  it('returns values from injectedMetadata.vars', () => {
    const setup = new InjectedMetadataService({
      injectedMetadata: {
        vars: {
          foo: {
            bar: '1',
          },
          'baz:box': {
            foo: 2,
          },
        },
      },
    } as any).setup();

    expect(setup.getInjectedVar('foo')).toEqual({
      bar: '1',
    });
    expect(setup.getInjectedVar('foo.bar')).toBe('1');
    expect(setup.getInjectedVar('baz:box')).toEqual({
      foo: 2,
    });
    expect(setup.getInjectedVar('')).toBe(undefined);
  });

  it('returns read-only values', () => {
    const setup = new InjectedMetadataService({
      injectedMetadata: {
        vars: {
          foo: {
            bar: 1,
          },
        },
      },
    } as any).setup();

    const foo: any = setup.getInjectedVar('foo');
    expect(() => {
      foo.bar = 2;
    }).toThrowErrorMatchingInlineSnapshot(
      `"Cannot assign to read only property 'bar' of object '#<Object>'"`
    );
    expect(() => {
      foo.newProp = 2;
    }).toThrowErrorMatchingInlineSnapshot(
      `"Cannot add property newProp, object is not extensible"`
    );
  });
});

describe('setup.getInjectedVars()', () => {
  it('returns all injected vars, readonly', () => {
    const setup = new InjectedMetadataService({
      injectedMetadata: {
        vars: {
          foo: {
            bar: 1,
          },
        },
      },
    } as any).setup();

    const vars: any = setup.getInjectedVars();
    expect(() => {
      vars.foo = 2;
    }).toThrowErrorMatchingInlineSnapshot(
      `"Cannot assign to read only property 'foo' of object '#<Object>'"`
    );
    expect(() => {
      vars.newProp = 2;
    }).toThrowErrorMatchingInlineSnapshot(
      `"Cannot add property newProp, object is not extensible"`
    );
  });
});
