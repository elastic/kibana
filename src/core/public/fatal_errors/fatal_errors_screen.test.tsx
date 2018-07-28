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

// @ts-ignore EuiCallOut not available until we upgrade to EUI 3.1.0
import { EuiCallOut } from '@elastic/eui';
import testSubjSelector from '@kbn/test-subj-selector';
import { mount, shallow } from 'enzyme';
import React from 'react';
import * as Rx from 'rxjs';

import { FatalErrorsScreen } from './fatal_errors_screen';

const errorInfoFoo = {
  message: 'foo',
  stack: 'Error: foo\n  stack...foo.js:1:1',
};
const errorInfoBar = {
  message: 'bar',
  stack: 'Error: bar\n  stack...bar.js:1:1',
};

const defaultProps = {
  buildNumber: 123,
  kibanaVersion: 'bar',
  errorInfo$: Rx.of(errorInfoFoo, errorInfoBar),
};

const noop = () => {
  // noop
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('reloading', () => {
  it('refreshes the page if a `hashchange` event is emitted', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

    const locationReloadSpy = jest.spyOn(window.location, 'reload').mockImplementation(noop);

    shallow(<FatalErrorsScreen {...defaultProps} />);
    expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).toHaveBeenCalledWith('hashchange', expect.any(Function), undefined);

    expect(locationReloadSpy).not.toHaveBeenCalled();
    const [, handler] = addEventListenerSpy.mock.calls[0];
    handler();
    expect(locationReloadSpy).toHaveBeenCalledTimes(1);
  });
});

describe('rendering', () => {
  it('render matches snapshot', () => {
    expect(shallow(<FatalErrorsScreen {...defaultProps} />)).toMatchSnapshot();
  });

  it('rerenders when errorInfo$ emits more errors', () => {
    const errorInfo$ = new Rx.ReplaySubject<typeof errorInfoFoo>();

    const el = shallow(<FatalErrorsScreen {...defaultProps} errorInfo$={errorInfo$} />);

    expect(el.find(EuiCallOut)).toHaveLength(0);

    errorInfo$.next(errorInfoFoo);
    el.update(); // allow setState() to cause a render

    expect(el.find(EuiCallOut)).toHaveLength(1);

    errorInfo$.next(errorInfoBar);
    el.update(); // allow setState() to cause a render

    expect(el.find(EuiCallOut)).toHaveLength(2);
  });
});

describe('buttons', () => {
  beforeAll(() => {
    Object.assign(window, {
      localStorage: {
        clear: jest.fn(),
      },
      sessionStorage: {
        clear: jest.fn(),
      },
    });
  });

  afterAll(() => {
    delete (window as any).localStorage;
    delete (window as any).sessionStorage;
  });

  describe('"Clear your session"', () => {
    it('clears localStorage, sessionStorage, the location.hash, and reloads the page', () => {
      window.location.hash = '/foo/bar';
      jest.spyOn(window.location, 'reload').mockImplementation(noop);

      const el = mount(<FatalErrorsScreen {...defaultProps} />);
      const button = el.find('button').find(testSubjSelector('clearSession'));
      button.simulate('click');

      expect(window.localStorage.clear).toHaveBeenCalled();
      expect(window.sessionStorage.clear).toHaveBeenCalled();
      expect(window.location.reload).toHaveBeenCalled();
      expect(window.location.hash).toBe('');
    });
  });

  describe('"Go back"', () => {
    it('calls window.history.back()', () => {
      jest.spyOn(window.history, 'back').mockImplementation(noop);

      const el = mount(<FatalErrorsScreen {...defaultProps} />);
      const button = el.find('button').find(testSubjSelector('goBack'));
      button.simulate('click');

      expect(window.history.back).toHaveBeenCalled();
    });
  });
});
