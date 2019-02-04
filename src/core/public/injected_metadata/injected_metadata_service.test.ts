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

import { InjectedMetadataService } from './injected_metadata_service';

describe('#getKibanaVersion', () => {
  it('returns version from injectedMetadata', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {
        version: 'foo',
      },
    } as any);

    expect(injectedMetadata.getKibanaVersion()).toBe('foo');
  });
});

describe('#getKibanaBuildNumber', () => {
  it('returns buildNumber from injectedMetadata', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {
        buildNumber: 'foo',
      },
    } as any);

    expect(injectedMetadata.getKibanaBuildNumber()).toBe('foo');
  });
});

describe('start.getLegacyMetadata()', () => {
  it('returns injectedMetadata.legacyMetadata', () => {
    const injectedMetadata = new InjectedMetadataService({
      injectedMetadata: {
        legacyMetadata: 'foo',
      },
    } as any);

    const contract = injectedMetadata.start();
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

    const legacyMetadata = injectedMetadata.start().getLegacyMetadata();
    expect(legacyMetadata).toEqual({
      foo: true,
    });
    expect(() => {
      // @ts-ignore TS knows this shouldn't be possible
      legacyMetadata.foo = false;
    }).toThrowError();
  });
});

describe('start.getInjectedVar()', () => {
  it('returns values from injectedMetadata.vars', () => {
    const start = new InjectedMetadataService({
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
    } as any).start();

    expect(start.getInjectedVar('foo')).toEqual({
      bar: '1',
    });
    expect(start.getInjectedVar('foo.bar')).toBe('1');
    expect(start.getInjectedVar('baz:box')).toEqual({
      foo: 2,
    });
    expect(start.getInjectedVar('')).toBe(undefined);
  });

  it('returns read-only values', () => {
    const start = new InjectedMetadataService({
      injectedMetadata: {
        vars: {
          foo: {
            bar: 1,
          },
        },
      },
    } as any).start();

    const foo: any = start.getInjectedVar('foo');
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

describe('start.getInjectedVars()', () => {
  it('returns all injected vars, readonly', () => {
    const start = new InjectedMetadataService({
      injectedMetadata: {
        vars: {
          foo: {
            bar: 1,
          },
        },
      },
    } as any).start();

    const vars: any = start.getInjectedVars();
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
