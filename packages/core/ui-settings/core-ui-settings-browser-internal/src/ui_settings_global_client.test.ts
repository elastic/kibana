/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject } from 'rxjs';
import { take, toArray } from 'rxjs/operators';

import { UiSettingsGlobalClient } from './ui_settings_global_client';

let done$: Subject<unknown>;

function setup(options: { defaults?: any; initialSettings?: any } = {}) {
  const { defaults = { dateFormat: { value: 'Browser' } }, initialSettings = {} } = options;

  const batchSetGlobal = jest.fn(() => ({
    settings: {},
  }));
  done$ = new Subject();
  const client = new UiSettingsGlobalClient({
    defaults,
    initialSettings,
    api: {
      batchSetGlobal,
    } as any,
    done$,
  });

  return { client, batchSetGlobal };
}

afterEach(() => {
  done$.complete();
});

describe('#get$', () => {
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
  it('resolves to false on failure', async () => {
    const { client, batchSetGlobal } = setup();

    batchSetGlobal.mockImplementation(() => {
      throw new Error('Error in request');
    });

    await expect(client.set('foo', 'bar')).resolves.toBe(false);
  });
});

describe('#remove', () => {
  it('resolves to false on failure', async () => {
    const { client, batchSetGlobal } = setup();

    batchSetGlobal.mockImplementation(() => {
      throw new Error('Error in request');
    });

    await expect(client.remove('dateFormat')).resolves.toBe(false);
  });
});
