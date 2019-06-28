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

import { materialize, take, toArray } from 'rxjs/operators';

import { UiSettingsClient } from './ui_settings_client';

function setup(options: { defaults?: any; initialSettings?: any } = {}) {
  const { defaults = { dateFormat: { value: 'Browser' } }, initialSettings = {} } = options;

  const batchSet = jest.fn(() => ({
    settings: {},
  }));

  const config = new UiSettingsClient({
    defaults,
    initialSettings,
    api: {
      batchSet,
    } as any,
  });

  return { config, batchSet };
}

describe('#get', () => {
  it('gives access to config values', () => {
    const { config } = setup();
    expect(config.get('dateFormat')).toMatchSnapshot();
  });

  it('supports the default value overload', () => {
    const { config } = setup();
    // default values are consumed and returned atomically
    expect(config.get('obscureProperty1', 'default')).toMatchSnapshot();
  });

  it('after a get for an unknown property, the property is not persisted', () => {
    const { config } = setup();
    config.get('obscureProperty2', 'default');

    // after a get, default values are NOT persisted
    expect(() => config.get('obscureProperty2')).toThrowErrorMatchingSnapshot();
  });

  it('honors the default parameter for unset options that are exported', () => {
    const { config } = setup();
    // if you are hitting this error, then a test is setting this config value globally and not unsetting it!
    expect(config.isDefault('dateFormat')).toBe(true);

    const defaultDateFormat = config.get('dateFormat');

    expect(config.get('dateFormat', 'xyz')).toBe('xyz');
    // shouldn't change other usages
    expect(config.get('dateFormat')).toBe(defaultDateFormat);
    expect(config.get('dataFormat', defaultDateFormat)).toBe(defaultDateFormat);
  });

  it("throws on unknown properties that don't have a value yet.", () => {
    const { config } = setup();
    expect(() => config.get('throwableProperty')).toThrowErrorMatchingSnapshot();
  });
});

describe('#get$', () => {
  it('emits the current value when called', async () => {
    const { config } = setup();
    const values = await config
      .get$('dateFormat')
      .pipe(
        take(1),
        toArray()
      )
      .toPromise();

    expect(values).toEqual(['Browser']);
  });

  it('emits an error notification if the key is unknown', async () => {
    const { config } = setup();
    const values = await config
      .get$('unknown key')
      .pipe(materialize())
      .toPromise();

    expect(values).toMatchInlineSnapshot(`
Notification {
  "error": [Error: Unexpected \`config.get("unknown key")\` call on unrecognized configuration setting "unknown key".
Setting an initial value via \`config.set("unknown key", value)\` before attempting to retrieve
any custom setting value for "unknown key" may fix this issue.
You can use \`config.get("unknown key", defaultValue)\`, which will just return
\`defaultValue\` when the key is unrecognized.],
  "hasValue": false,
  "kind": "E",
  "value": undefined,
}
`);
  });

  it('emits the new value when it changes', async () => {
    const { config } = setup();

    setTimeout(() => {
      config.set('dateFormat', 'new format');
    }, 10);

    const values = await config
      .get$('dateFormat')
      .pipe(
        take(2),
        toArray()
      )
      .toPromise();

    expect(values).toEqual(['Browser', 'new format']);
  });

  it('emits the default override if no value is set, or if the value is removed', async () => {
    const { config } = setup();

    setTimeout(() => {
      config.set('dateFormat', 'new format');
    }, 10);

    setTimeout(() => {
      config.remove('dateFormat');
    }, 20);

    const values = await config
      .get$('dateFormat', 'my default')
      .pipe(
        take(3),
        toArray()
      )
      .toPromise();

    expect(values).toEqual(['my default', 'new format', 'my default']);
  });
});

describe('#set', () => {
  it('stores a value in the config val set', () => {
    const { config } = setup();
    const original = config.get('dateFormat');
    config.set('dateFormat', 'notaformat');
    expect(config.get('dateFormat')).toBe('notaformat');
    config.set('dateFormat', original);
  });

  it('stores a value in a previously unknown config key', () => {
    const { config } = setup();
    expect(() => config.set('unrecognizedProperty', 'somevalue')).not.toThrowError();
    expect(config.get('unrecognizedProperty')).toBe('somevalue');
  });

  it('resolves to true on success', async () => {
    const { config } = setup();
    await expect(config.set('foo', 'bar')).resolves.toBe(true);
  });

  it('resolves to false on failure', async () => {
    const { config, batchSet } = setup();

    batchSet.mockImplementation(() => {
      throw new Error('Error in request');
    });

    await expect(config.set('foo', 'bar')).resolves.toBe(false);
  });

  it('throws an error if key is overridden', async () => {
    const { config } = setup({
      initialSettings: {
        foo: {
          isOverridden: true,
          value: 'bar',
        },
      },
    });
    await expect(config.set('foo', true)).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe('#remove', () => {
  it('resolves to true on success', async () => {
    const { config } = setup();
    await expect(config.remove('dateFormat')).resolves.toBe(true);
  });

  it('resolves to false on failure', async () => {
    const { config, batchSet } = setup();

    batchSet.mockImplementation(() => {
      throw new Error('Error in request');
    });

    await expect(config.remove('dateFormat')).resolves.toBe(false);
  });

  it('throws an error if key is overridden', async () => {
    const { config } = setup({
      initialSettings: {
        bar: {
          isOverridden: true,
          userValue: true,
        },
      },
    });
    await expect(config.remove('bar')).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe('#isDeclared', () => {
  it('returns true if name is know', () => {
    const { config } = setup();
    expect(config.isDeclared('dateFormat')).toBe(true);
  });

  it('returns false if name is not known', () => {
    const { config } = setup();
    expect(config.isDeclared('dateFormat')).toBe(true);
  });
});

describe('#isDefault', () => {
  it('returns true if value is default', () => {
    const { config } = setup();
    expect(config.isDefault('dateFormat')).toBe(true);
  });

  it('returns false if name is not known', () => {
    const { config } = setup();
    config.set('dateFormat', 'foo');
    expect(config.isDefault('dateFormat')).toBe(false);
  });
});

describe('#isCustom', () => {
  it('returns false if name is in from defaults', () => {
    const { config } = setup();
    expect(config.isCustom('dateFormat')).toBe(false);
  });

  it('returns false for unknown name', () => {
    const { config } = setup();
    expect(config.isCustom('foo')).toBe(false);
  });

  it('returns true if name is from unknown set()', () => {
    const { config } = setup();
    config.set('foo', 'bar');
    expect(config.isCustom('foo')).toBe(true);
  });
});

describe('#getUpdate$', () => {
  it('sends { key, newValue, oldValue } notifications when config changes', () => {
    const handler = jest.fn();
    const { config } = setup();

    config.getUpdate$().subscribe(handler);
    expect(handler).not.toHaveBeenCalled();

    config.set('foo', 'bar');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls).toMatchSnapshot();
    handler.mockClear();

    config.set('foo', 'baz');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls).toMatchSnapshot();
  });

  it('observables complete when client is stopped', () => {
    const onComplete = jest.fn();
    const { config } = setup();

    config.getUpdate$().subscribe({
      complete: onComplete,
    });

    expect(onComplete).not.toHaveBeenCalled();
    config.stop();
    expect(onComplete).toHaveBeenCalled();
  });
});

describe('#overrideLocalDefault', () => {
  describe('key has no user value', () => {
    it('synchronously modifies the default value returned by get()', () => {
      const { config } = setup();

      expect(config.get('dateFormat')).toMatchSnapshot('get before override');
      config.overrideLocalDefault('dateFormat', 'bar');
      expect(config.get('dateFormat')).toMatchSnapshot('get after override');
    });

    it('synchronously modifies the value returned by getAll()', () => {
      const { config } = setup();

      expect(config.getAll()).toMatchSnapshot('getAll before override');
      config.overrideLocalDefault('dateFormat', 'bar');
      expect(config.getAll()).toMatchSnapshot('getAll after override');
    });

    it('calls subscriber with new and previous value', () => {
      const handler = jest.fn();
      const { config } = setup();

      config.getUpdate$().subscribe(handler);
      config.overrideLocalDefault('dateFormat', 'bar');
      expect(handler.mock.calls).toMatchSnapshot('single subscriber call');
    });
  });

  describe('key with user value', () => {
    it('does not modify the return value of get', () => {
      const { config } = setup();

      config.set('dateFormat', 'foo');
      expect(config.get('dateFormat')).toMatchSnapshot('get before override');
      config.overrideLocalDefault('dateFormat', 'bar');
      expect(config.get('dateFormat')).toMatchSnapshot('get after override');
    });

    it('is included in the return value of getAll', () => {
      const { config } = setup();

      config.set('dateFormat', 'foo');
      expect(config.getAll()).toMatchSnapshot('getAll before override');
      config.overrideLocalDefault('dateFormat', 'bar');
      expect(config.getAll()).toMatchSnapshot('getAll after override');
    });

    it('does not call subscriber', () => {
      const handler = jest.fn();
      const { config } = setup();

      config.set('dateFormat', 'foo');
      config.getUpdate$().subscribe(handler);
      config.overrideLocalDefault('dateFormat', 'bar');
      expect(handler).not.toHaveBeenCalled();
    });

    it('returns default override when setting removed', () => {
      const { config } = setup();

      config.set('dateFormat', 'foo');
      config.overrideLocalDefault('dateFormat', 'bar');

      expect(config.get('dateFormat')).toMatchSnapshot('get before override');
      expect(config.getAll()).toMatchSnapshot('getAll before override');

      config.remove('dateFormat');

      expect(config.get('dateFormat')).toMatchSnapshot('get after override');
      expect(config.getAll()).toMatchSnapshot('getAll after override');
    });
  });

  describe('#isOverridden()', () => {
    it('returns false if key is unknown', () => {
      const { config } = setup();
      expect(config.isOverridden('foo')).toBe(false);
    });

    it('returns false if key is no overridden', () => {
      const { config } = setup({
        initialSettings: {
          foo: {
            userValue: 1,
          },
          bar: {
            isOverridden: true,
            userValue: 2,
          },
        },
      });
      expect(config.isOverridden('foo')).toBe(false);
    });

    it('returns true when key is overridden', () => {
      const { config } = setup({
        initialSettings: {
          foo: {
            userValue: 1,
          },
          bar: {
            isOverridden: true,
            userValue: 2,
          },
        },
      });
      expect(config.isOverridden('bar')).toBe(true);
    });

    it('returns false for object prototype properties', () => {
      const { config } = setup();
      expect(config.isOverridden('hasOwnProperty')).toBe(false);
    });
  });
});
