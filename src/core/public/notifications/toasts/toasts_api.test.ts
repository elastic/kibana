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

import { take } from 'rxjs/operators';

import { ToastsApi } from './toasts_api';

import { uiSettingsServiceMock } from '../../ui_settings/ui_settings_service.mock';
import { i18nServiceMock } from '../../i18n/i18n_service.mock';

async function getCurrentToasts(toasts: ToastsApi) {
  return await toasts.get$().pipe(take(1)).toPromise();
}

function uiSettingsMock() {
  const mock = uiSettingsServiceMock.createSetupContract();
  mock.get.mockImplementation(() => (config: string) => {
    switch (config) {
      case 'notifications:lifetime:info':
        return 5000;
      case 'notifications:lifetime:warning':
        return 10000;
      case 'notification:lifetime:error':
        return 30000;
      default:
        throw new Error(`Accessing ${config} is not supported in the mock.`);
    }
  });
  return mock;
}

function toastDeps() {
  return {
    uiSettings: uiSettingsMock(),
  };
}

function startDeps() {
  return { overlays: {} as any, i18n: i18nServiceMock.createStartContract() };
}

describe('#get$()', () => {
  it('returns observable that emits NEW toast list when something added or removed', () => {
    const toasts = new ToastsApi(toastDeps());
    const onToasts = jest.fn();

    toasts.get$().subscribe(onToasts);
    const foo = toasts.add('foo');
    const bar = toasts.add('bar');
    toasts.remove(foo);

    expect(onToasts).toHaveBeenCalledTimes(4);

    const initial = onToasts.mock.calls[0][0];
    expect(initial).toEqual([]);

    const afterFoo = onToasts.mock.calls[1][0];
    expect(afterFoo).not.toBe(initial);
    expect(afterFoo).toEqual([foo]);

    const afterFooAndBar = onToasts.mock.calls[2][0];
    expect(afterFooAndBar).not.toBe(afterFoo);
    expect(afterFooAndBar).toEqual([foo, bar]);

    const afterRemoveFoo = onToasts.mock.calls[3][0];
    expect(afterRemoveFoo).not.toBe(afterFooAndBar);
    expect(afterRemoveFoo).toEqual([bar]);
  });

  it('does not emit a new toast list when unknown toast is passed to remove()', () => {
    const toasts = new ToastsApi(toastDeps());
    const onToasts = jest.fn();

    toasts.get$().subscribe(onToasts);
    toasts.add('foo');
    onToasts.mockClear();

    toasts.remove('bar');
    expect(onToasts).not.toHaveBeenCalled();
  });
});

describe('#add()', () => {
  it('returns toast objects with auto assigned id', () => {
    const toasts = new ToastsApi(toastDeps());
    const toast = toasts.add({ title: 'foo' });
    expect(toast).toHaveProperty('id');
    expect(toast).toHaveProperty('title', 'foo');
  });

  it('adds the toast to toasts list', async () => {
    const toasts = new ToastsApi(toastDeps());
    const toast = toasts.add({});

    const currentToasts = await getCurrentToasts(toasts);
    expect(currentToasts).toHaveLength(1);
    expect(currentToasts[0]).toBe(toast);
  });

  it('increments the toast ID for each additional toast', () => {
    const toasts = new ToastsApi(toastDeps());
    expect(toasts.add({})).toHaveProperty('id', '0');
    expect(toasts.add({})).toHaveProperty('id', '1');
    expect(toasts.add({})).toHaveProperty('id', '2');
  });

  it('accepts a string, uses it as the title', async () => {
    const toasts = new ToastsApi(toastDeps());
    expect(toasts.add('foo')).toHaveProperty('title', 'foo');
  });
});

describe('#remove()', () => {
  it('removes a toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    toasts.remove(toasts.add('Test'));
    expect(await getCurrentToasts(toasts)).toHaveLength(0);
  });

  it('ignores unknown toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    toasts.add('Test');
    toasts.remove('foo');

    const currentToasts = await getCurrentToasts(toasts);
    expect(currentToasts).toHaveLength(1);
  });
});

describe('#addInfo()', () => {
  it('adds a info toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    expect(toasts.addInfo({})).toHaveProperty('color', 'primary');
  });

  it('returns the created toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    const toast = toasts.addInfo({}, { toastLifeTimeMs: 1 });
    const currentToasts = await getCurrentToasts(toasts);
    expect(currentToasts[0].toastLifeTimeMs).toBe(1);
    expect(currentToasts[0]).toBe(toast);
  });
});

describe('#addSuccess()', () => {
  it('adds a success toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    expect(toasts.addSuccess({})).toHaveProperty('color', 'success');
  });

  it('returns the created toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    const toast = toasts.addSuccess({});
    const currentToasts = await getCurrentToasts(toasts);
    expect(currentToasts[0]).toBe(toast);
  });
});

describe('#addWarning()', () => {
  it('adds a warning toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    expect(toasts.addWarning({})).toHaveProperty('color', 'warning');
  });

  it('returns the created toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    const toast = toasts.addWarning({});
    const currentToasts = await getCurrentToasts(toasts);
    expect(currentToasts[0]).toBe(toast);
  });
});

describe('#addDanger()', () => {
  it('adds a danger toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    expect(toasts.addDanger({})).toHaveProperty('color', 'danger');
  });

  it('returns the created toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    const toast = toasts.addDanger({});
    const currentToasts = await getCurrentToasts(toasts);
    expect(currentToasts[0]).toBe(toast);
  });
});

describe('#addError', () => {
  it('adds an error toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    toasts.start(startDeps());
    const toast = toasts.addError(new Error('unexpected error'), { title: 'Something went wrong' });
    expect(toast).toHaveProperty('color', 'danger');
    expect(toast).toHaveProperty('title', 'Something went wrong');
  });

  it('returns the created toast', async () => {
    const toasts = new ToastsApi(toastDeps());
    toasts.start(startDeps());
    const toast = toasts.addError(new Error('unexpected error'), { title: 'Something went wrong' });
    const currentToasts = await getCurrentToasts(toasts);
    expect(currentToasts[0]).toBe(toast);
  });
});
