/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { materialize, take, toArray } from 'rxjs/operators';

import { UiSettingsClient } from './ui_settings_client';

let done$: Subject<unknown>;

function setup(options: { defaults?: any; initialSettings?: any } = {}) {
  const { defaults = { dateFormat: { value: 'Browser' } }, initialSettings = {} } = options;

  const batchSet = jest.fn(() => ({
    settings: {},
  }));
  const batchSetGlobal = jest.fn(() => ({
    settings: {},
  }));
  done$ = new Subject();
  const client = new UiSettingsClient({
    defaults,
    initialSettings,
    api: {
      batchSet,
      batchSetGlobal,
    } as any,
    done$,
  });

  return { client, batchSet, batchSetGlobal };
}

afterEach(() => {
  done$.complete();
});

describe('#get', () => {
  it('gives access to uiSettings values', () => {
    const { client } = setup();
    expect(client.get('dateFormat')).toMatchSnapshot();
  });

  it('supports the default value overload', () => {
    const { client } = setup();
    // default values are consumed and returned atomically
    expect(client.get('obscureProperty1', 'default')).toMatchSnapshot();
  });

  it('after a get for an unknown property, the property is not persisted', () => {
    const { client } = setup();
    client.get('obscureProperty2', 'default');

    // after a get, default values are NOT persisted
    expect(() => client.get('obscureProperty2')).toThrowErrorMatchingSnapshot();
  });

  it('honors the default parameter for unset options that are exported', () => {
    const { client } = setup();
    // if you are hitting this error, then a test is setting this client value globally and not unsetting it!
    expect(client.isDefault('dateFormat')).toBe(true);

    const defaultDateFormat = client.get('dateFormat');

    expect(client.get('dateFormat', 'xyz')).toBe('xyz');
    // shouldn't change other usages
    expect(client.get('dateFormat')).toBe(defaultDateFormat);
    expect(client.get('dataFormat', defaultDateFormat)).toBe(defaultDateFormat);
  });

  it("throws on unknown properties that don't have a value yet.", () => {
    const { client } = setup();
    expect(() => client.get('throwableProperty')).toThrowErrorMatchingSnapshot();
  });
});

describe('#get$', () => {
  it('emits the current value when called', async () => {
    const { client } = setup();
    const values = await client.get$('dateFormat').pipe(take(1), toArray()).toPromise();

    expect(values).toEqual(['Browser']);
  });

  it('emits an error notification if the key is unknown', async () => {
    const { client } = setup();
    const values = await client.get$('unknown key').pipe(materialize()).toPromise();

    expect(values).toMatchInlineSnapshot(`
Notification {
  "error": [Error: Unexpected \`IUiSettingsClient.get("unknown key")\` call on unrecognized configuration setting "unknown key".
Setting an initial value via \`IUiSettingsClient.set("unknown key", value)\` before attempting to retrieve
any custom setting value for "unknown key" may fix this issue.
You can use \`IUiSettingsClient.get("unknown key", defaultValue)\`, which will just return
\`defaultValue\` when the key is unrecognized.],
  "hasValue": false,
  "kind": "E",
  "value": undefined,
}
`);
  });

  it('emits the new value when it changes', async () => {
    const { client } = setup();

    setTimeout(() => {
      client.set('dateFormat', 'new format');
    }, 10);

    const values = await client.get$('dateFormat').pipe(take(2), toArray()).toPromise();

    expect(values).toEqual(['Browser', 'new format']);
  });

  it('emits the default override if no value is set, or if the value is removed', async () => {
    const { client } = setup();

    setTimeout(() => {
      client.set('dateFormat', 'new format');
    }, 10);

    setTimeout(() => {
      client.remove('dateFormat');
    }, 20);

    const values = await client
      .get$('dateFormat', 'my default')
      .pipe(take(3), toArray())
      .toPromise();

    expect(values).toEqual(['my default', 'new format', 'my default']);
  });
});

describe('#set', () => {
  it('stores a value in the client val set', () => {
    const { client } = setup();
    const original = client.get('dateFormat');
    client.set('dateFormat', 'notaformat');
    expect(client.get('dateFormat')).toBe('notaformat');
    client.set('dateFormat', original);
  });

  it('stores a value in a previously unknown client key', () => {
    const { client } = setup();
    expect(() => client.set('unrecognizedProperty', 'somevalue')).not.toThrowError();
    expect(client.get('unrecognizedProperty')).toBe('somevalue');
  });

  it('resolves to true on success', async () => {
    const { client } = setup();
    await expect(client.set('foo', 'bar')).resolves.toBe(true);
  });

  it('resolves to false on failure', async () => {
    const { client, batchSet } = setup();

    batchSet.mockImplementation(() => {
      throw new Error('Error in request');
    });

    await expect(client.set('foo', 'bar')).resolves.toBe(false);
  });

  it('throws an error if key is overridden', async () => {
    const { client } = setup({
      initialSettings: {
        foo: {
          isOverridden: true,
          value: 'bar',
        },
      },
    });
    await expect(client.set('foo', true)).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe('#remove', () => {
  it('resolves to true on success', async () => {
    const { client } = setup();
    await expect(client.remove('dateFormat')).resolves.toBe(true);
  });

  it('resolves to false on failure', async () => {
    const { client, batchSet } = setup();

    batchSet.mockImplementation(() => {
      throw new Error('Error in request');
    });

    await expect(client.remove('dateFormat')).resolves.toBe(false);
  });

  it('throws an error if key is overridden', async () => {
    const { client } = setup({
      initialSettings: {
        bar: {
          isOverridden: true,
          userValue: true,
        },
      },
    });
    await expect(client.remove('bar')).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe('#isDeclared', () => {
  it('returns true if name is know', () => {
    const { client } = setup();
    expect(client.isDeclared('dateFormat')).toBe(true);
  });

  it('returns false if name is not known', () => {
    const { client } = setup();
    expect(client.isDeclared('dateFormat')).toBe(true);
  });
});

describe('#isDefault', () => {
  it('returns true if value is default', () => {
    const { client } = setup();
    expect(client.isDefault('dateFormat')).toBe(true);
  });

  it('returns false if name is not known', () => {
    const { client } = setup();
    client.set('dateFormat', 'foo');
    expect(client.isDefault('dateFormat')).toBe(false);
  });
});

describe('#isCustom', () => {
  it('returns false if name is in from defaults', () => {
    const { client } = setup();
    expect(client.isCustom('dateFormat')).toBe(false);
  });

  it('returns false for unknown name', () => {
    const { client } = setup();
    expect(client.isCustom('foo')).toBe(false);
  });

  it('returns true if name is from unknown set()', () => {
    const { client } = setup();
    client.set('foo', 'bar');
    expect(client.isCustom('foo')).toBe(true);
  });
});

describe('#getUpdate$', () => {
  it('sends { key, newValue, oldValue } notifications when client changes', () => {
    const handler = jest.fn();
    const { client } = setup();

    client.getUpdate$().subscribe(handler);
    expect(handler).not.toHaveBeenCalled();

    client.set('foo', 'bar');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls).toMatchSnapshot();
    handler.mockClear();

    client.set('foo', 'baz');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls).toMatchSnapshot();
  });

  it('observables complete when client is stopped', () => {
    const onComplete = jest.fn();
    const { client } = setup();

    client.getUpdate$().subscribe({
      complete: onComplete,
    });

    expect(onComplete).not.toHaveBeenCalled();
    done$.complete();
    expect(onComplete).toHaveBeenCalled();
  });
});
