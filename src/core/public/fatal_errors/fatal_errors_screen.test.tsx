/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCallOut } from '@elastic/eui';
import testSubjSelector from '@kbn/test-subj-selector';
import React from 'react';
import * as Rx from 'rxjs';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';

import { FatalErrorsScreen } from './fatal_errors_screen';

describe('FatalErrorsScreen', () => {
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

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        reload: jest.fn(),
      },
    });
  });

  describe('reloading', () => {
    it('refreshes the page if a `hashchange` event is emitted', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      shallowWithIntl(<FatalErrorsScreen {...defaultProps} />);
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'hashchange',
        expect.any(Function),
        undefined
      );

      expect(window.location.reload).not.toHaveBeenCalled();
      const [, handler] = (window as any).addEventListener.mock.calls[0];
      (handler as jest.Mock)();
      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('rendering', () => {
    it('render matches snapshot', () => {
      expect(shallowWithIntl(<FatalErrorsScreen {...defaultProps} />)).toMatchSnapshot();
    });

    it('rerenders when errorInfo$ emits more errors', () => {
      const errorInfo$ = new Rx.ReplaySubject<typeof errorInfoFoo>();

      const el = shallowWithIntl(<FatalErrorsScreen {...defaultProps} errorInfo$={errorInfo$} />);

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
      delete (window as any).localStorage;
      delete (window as any).sessionStorage;

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

        const el = mountWithIntl(<FatalErrorsScreen {...defaultProps} />);
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

        const el = mountWithIntl(<FatalErrorsScreen {...defaultProps} />);
        const button = el.find('button').find(testSubjSelector('goBack'));
        button.simulate('click');

        expect(window.history.back).toHaveBeenCalled();
      });
    });
  });
});
