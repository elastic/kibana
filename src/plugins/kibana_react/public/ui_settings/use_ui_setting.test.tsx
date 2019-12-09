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

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import { useUiSetting$ } from './use_ui_setting';
import { createKibanaReactContext } from '../context';
import { KibanaServices } from '../context/types';
import { Subject } from 'rxjs';
import { useObservable } from '../util/use_observable';
import { coreMock } from '../../../../core/public/mocks';

jest.mock('../util/use_observable');
const useObservableSpy = (useObservable as any) as jest.SpyInstance;
useObservableSpy.mockImplementation((observable, def) => def);

const mock = (): [KibanaServices, Subject<any>] => {
  const core = coreMock.createStart();
  const get = core.uiSettings.get;
  const get$ = core.uiSettings.get$;
  const subject = new Subject();

  get.mockImplementation(() => 'bar');
  get$.mockImplementation(() => subject);

  return [core, subject];
};

let container: HTMLDivElement | null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  useObservableSpy.mockClear();
});

afterEach(() => {
  document.body.removeChild(container!);
  container = null;
});

describe('useUiSetting', () => {
  const TestConsumer: React.FC<{
    setting: string;
    newValue?: string;
  }> = ({ setting, newValue = '' }) => {
    const [value, set] = useUiSetting$(setting, 'DEFAULT');

    return (
      <div>
        {setting}: <strong>{value}</strong>
        <button onClick={() => set(newValue)}>Set new value!</button>
      </div>
    );
  };

  test('returns setting value', async () => {
    const [core] = mock();
    const { Provider } = createKibanaReactContext(core);

    ReactDOM.render(
      <Provider>
        <TestConsumer setting="foo" />
      </Provider>,
      container
    );

    const strong = container!.querySelector('strong');
    expect(strong!.textContent).toBe('bar');
    expect(core.uiSettings!.get).toHaveBeenCalledTimes(1);
    expect((core.uiSettings!.get as any).mock.calls[0][0]).toBe('foo');
  });

  test('calls uiSettings.get() method with correct key and default value', async () => {
    const [core] = mock();
    const { Provider } = createKibanaReactContext(core);

    ReactDOM.render(
      <Provider>
        <TestConsumer setting="foo" />
      </Provider>,
      container
    );

    expect(core.uiSettings!.get).toHaveBeenCalledTimes(1);
    expect((core.uiSettings!.get as any).mock.calls[0][0]).toBe('foo');
    expect((core.uiSettings!.get as any).mock.calls[0][1]).toBe('DEFAULT');
  });
});

describe('useUiSetting$', () => {
  const TestConsumerX: React.FC<{
    setting: string;
    newValue?: string;
  }> = ({ setting, newValue = '' }) => {
    const [value, set] = useUiSetting$(setting, 'DEFAULT');

    return (
      <div>
        {setting}: <strong>{value}</strong>
        <button onClick={() => set(newValue)}>Set new value!</button>
      </div>
    );
  };

  test('synchronously renders setting value', async () => {
    const [core] = mock();
    const { Provider } = createKibanaReactContext(core);

    ReactDOM.render(
      <Provider>
        <TestConsumerX setting="foo" />
      </Provider>,
      container
    );

    const strong = container!.querySelector('strong');
    expect(strong!.textContent).toBe('bar');
    expect(core.uiSettings!.get).toHaveBeenCalledTimes(1);
    expect((core.uiSettings!.get as any).mock.calls[0][0]).toBe('foo');
  });

  test('calls Core with correct arguments', async () => {
    const core = coreMock.createStart();
    const { Provider } = createKibanaReactContext(core);

    ReactDOM.render(
      <Provider>
        <TestConsumerX setting="non_existing" />
      </Provider>,
      container
    );

    expect(core.uiSettings!.get).toHaveBeenCalledWith('non_existing', 'DEFAULT');
  });

  test('subscribes to observable using useObservable', async () => {
    const [core, subject] = mock();
    const { Provider } = createKibanaReactContext(core);

    expect(useObservableSpy).toHaveBeenCalledTimes(0);

    ReactDOM.render(
      <Provider>
        <TestConsumerX setting="theme:darkMode" />
      </Provider>,
      container
    );

    expect(useObservableSpy).toHaveBeenCalledTimes(1);
    expect(useObservableSpy.mock.calls[0][0]).toBe(subject);
  });

  test('can set new hook value', async () => {
    const [core] = mock();
    const { Provider } = createKibanaReactContext(core);

    ReactDOM.render(
      <Provider>
        <TestConsumerX setting="a" newValue="c" />
      </Provider>,
      container
    );

    expect(core.uiSettings!.set).toHaveBeenCalledTimes(0);

    act(() => {
      Simulate.click(container!.querySelector('button')!, {});
    });

    expect(core.uiSettings!.set).toHaveBeenCalledTimes(1);
    expect(core.uiSettings!.set).toHaveBeenCalledWith('a', 'c');
  });
});
