/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { useDarkMode } from './use_dark_mode';
import { createKibanaReactContext } from '../context';
import { KibanaServices } from '../context/types';
import { BehaviorSubject } from 'rxjs';
import { CoreTheme } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';

describe('useDarkMode', () => {
  let container: HTMLDivElement | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container!);
    container = null;
  });

  const TestConsumer: React.FC = () => {
    const darkMode = useDarkMode();
    return <div>{String(darkMode)}</div>;
  };

  const mock = (): [KibanaServices, BehaviorSubject<CoreTheme>] => {
    const core = coreMock.createStart();
    const subject = new BehaviorSubject<CoreTheme>({ darkMode: false, name: 'amsterdam' });
    core.theme.theme$ = subject.asObservable();

    return [core, subject];
  };

  test('returns the value from the theme', () => {
    const [core] = mock();
    const { Provider } = createKibanaReactContext(core);

    ReactDOM.render(
      <Provider>
        <TestConsumer />
      </Provider>,
      container
    );

    const div = container!.querySelector('div');
    expect(div!.textContent).toBe('false');
  });

  test('value changes if the theme changes', () => {
    const [core, subject] = mock();
    const { Provider } = createKibanaReactContext(core);

    ReactDOM.render(
      <Provider>
        <TestConsumer />
      </Provider>,
      container
    );

    let div = container!.querySelector('div');
    expect(div!.textContent).toBe('false');

    act(() => {
      subject.next({ darkMode: true, name: 'amsterdam' });
    });

    div = container!.querySelector('div');
    expect(div!.textContent).toBe('true');
  });
});
