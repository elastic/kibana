/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { Subject } from 'rxjs';
import { share } from 'rxjs/operators';
import { ReactExpressionRenderer } from './react_expression_renderer';
import { mount } from 'enzyme';
import { EuiProgress } from '@elastic/eui';
import { IInterpreterRenderHandlers } from '../../common';
import { ExpressionLoader } from '../loader';
import { RenderErrorHandlerFnType, ExpressionRendererEvent } from '../types';

jest.mock('../loader', () => {
  return {
    ExpressionLoader: jest.fn().mockImplementation(() => {
      return {};
    }),
    loader: jest.fn(),
  };
});

describe('ExpressionRenderer', () => {
  it('starts to load, resolves, and goes back to loading', () => {
    const dataSubject = new Subject();
    const data$ = dataSubject.asObservable().pipe(share());
    const renderSubject = new Subject();
    const render$ = renderSubject.asObservable().pipe(share());
    const loadingSubject = new Subject<void>();
    const loading$ = loadingSubject.asObservable().pipe(share());

    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$,
        data$,
        loading$,
        update: jest.fn(),
      };
    });

    const instance = mount(<ReactExpressionRenderer expression="" />);

    act(() => {
      loadingSubject.next();
    });

    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(1);

    act(() => {
      renderSubject.next(1);
    });

    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(0);

    instance.setProps({ expression: 'something new' });
    act(() => {
      loadingSubject.next();
    });
    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(1);
    act(() => {
      renderSubject.next(1);
    });
    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(0);
  });

  it('updates the expression loader when refresh subject emits', () => {
    const refreshSubject = new Subject<void>();
    const loaderUpdate = jest.fn();

    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$: new Subject(),
        data$: new Subject(),
        loading$: new Subject(),
        update: loaderUpdate,
        destroy: jest.fn(),
      };
    });

    const instance = mount(<ReactExpressionRenderer reload$={refreshSubject} expression="" />);

    act(() => {
      refreshSubject.next();
    });

    expect(loaderUpdate).toHaveBeenCalled();

    instance.unmount();
  });

  it('waits for debounce period if specified', () => {
    jest.useFakeTimers('modern');

    const refreshSubject = new Subject();
    const loaderUpdate = jest.fn();

    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$: new Subject(),
        data$: new Subject(),
        loading$: new Subject(),
        update: loaderUpdate,
        destroy: jest.fn(),
      };
    });

    const instance = mount(
      <ReactExpressionRenderer reload$={refreshSubject} expression="" debounce={1000} />
    );

    instance.setProps({ expression: 'abc' });

    expect(loaderUpdate).not.toHaveBeenCalled();

    act(() => {
      jest.runAllTimers();
    });

    expect(loaderUpdate).toHaveBeenCalledTimes(1);

    instance.unmount();
  });

  it('should not update twice immediately after rendering', () => {
    jest.useFakeTimers('modern');

    const refreshSubject = new Subject();
    const loaderUpdate = jest.fn();

    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$: new Subject(),
        data$: new Subject(),
        loading$: new Subject(),
        update: loaderUpdate,
        destroy: jest.fn(),
      };
    });

    const instance = mount(
      <ReactExpressionRenderer reload$={refreshSubject} expression="" debounce={1000} />
    );

    act(() => {
      jest.runAllTimers();
    });

    expect(loaderUpdate).not.toHaveBeenCalled();

    instance.unmount();
  });

  it('waits for debounce period on other loader option change if specified', () => {
    jest.useFakeTimers('modern');

    const refreshSubject = new Subject();
    const loaderUpdate = jest.fn();

    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$: new Subject(),
        data$: new Subject(),
        loading$: new Subject(),
        update: loaderUpdate,
        destroy: jest.fn(),
      };
    });

    const instance = mount(
      <ReactExpressionRenderer
        reload$={refreshSubject}
        expression=""
        debounce={1000}
        searchContext={{ from: 'now-15m', to: 'now' }}
      />
    );

    instance.setProps({ searchContext: { from: 'now-30m', to: 'now' } });

    expect(loaderUpdate).not.toHaveBeenCalled();

    act(() => {
      jest.runAllTimers();
    });

    expect(loaderUpdate).toHaveBeenCalledTimes(1);

    instance.unmount();
  });

  it('should display a custom error message if the user provides one and then remove it after successful render', () => {
    const dataSubject = new Subject();
    const data$ = dataSubject.asObservable().pipe(share());
    const renderSubject = new Subject();
    const render$ = renderSubject.asObservable().pipe(share());
    const loadingSubject = new Subject<void>();
    const loading$ = loadingSubject.asObservable().pipe(share());

    let onRenderError: RenderErrorHandlerFnType;
    (ExpressionLoader as jest.Mock).mockImplementation((...args) => {
      const params = args[2];
      onRenderError = params.onRenderError;
      return {
        render$,
        data$,
        loading$,
        update: jest.fn(),
      };
    });

    const instance = mount(
      <ReactExpressionRenderer
        expression=""
        renderError={(message) => <div data-test-subj={'custom-error'}>{message}</div>}
      />
    );

    act(() => {
      onRenderError!(instance.getDOMNode(), new Error('render error'), {
        done: () => {
          renderSubject.next(1);
        },
      } as IInterpreterRenderHandlers);
    });

    instance.update();
    expect(instance.find(EuiProgress)).toHaveLength(0);
    expect(instance.find('[data-test-subj="custom-error"]')).toHaveLength(1);
    expect(instance.find('[data-test-subj="custom-error"]').contains('render error')).toBeTruthy();

    act(() => {
      loadingSubject.next();
      renderSubject.next(2);
    });
    instance.update();
    expect(instance.find(EuiProgress)).toHaveLength(0);
    expect(instance.find('[data-test-subj="custom-error"]')).toHaveLength(0);
  });

  it('should call onData$ prop on every data$ observable emission in loader', () => {
    const dataSubject = new Subject();
    const data$ = dataSubject.asObservable().pipe(share());

    const result = {};
    const inspectData = {};
    const onData$ = jest.fn();

    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$: new Subject(),
        data$,
        loading$: new Subject(),
        events$: new Subject(),
        update: jest.fn(),
        inspect: jest.fn(() => inspectData),
      };
    });

    mount(<ReactExpressionRenderer expression="" onData$={onData$} />);

    expect(onData$).toHaveBeenCalledTimes(0);

    act(() => {
      dataSubject.next({ result });
    });

    expect(onData$).toHaveBeenCalledTimes(1);
    expect(onData$.mock.calls[0][0]).toBe(result);
    expect(onData$.mock.calls[0][1]).toBe(inspectData);
  });

  it('should fire onEvent prop on every events$ observable emission in loader', () => {
    const dataSubject = new Subject();
    const data$ = dataSubject.asObservable().pipe(share());
    const renderSubject = new Subject();
    const render$ = renderSubject.asObservable().pipe(share());
    const loadingSubject = new Subject();
    const loading$ = loadingSubject.asObservable().pipe(share());
    const eventsSubject = new Subject<ExpressionRendererEvent>();
    const events$ = eventsSubject.asObservable().pipe(share());

    const onEvent = jest.fn();
    const event: ExpressionRendererEvent = {
      name: 'foo',
      data: {
        bar: 'baz',
      },
    };

    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$,
        data$,
        loading$,
        events$,
        update: jest.fn(),
      };
    });

    mount(<ReactExpressionRenderer expression="" onEvent={onEvent} />);

    expect(onEvent).toHaveBeenCalledTimes(0);

    act(() => {
      eventsSubject.next(event);
    });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent.mock.calls[0][0]).toBe(event);
  });

  it('should correctly assign classes to the wrapper node', () => {
    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$: new Subject(),
        data$: new Subject(),
        loading$: new Subject(),
        update: jest.fn(),
        destroy: jest.fn(),
      };
    });

    const instance = mount(<ReactExpressionRenderer className="myClassName" expression="" />);
    // Counte is 2 because the class is applied to ReactExpressionRenderer + internal component
    expect(instance.find('.myClassName').length).toBe(2);

    instance.unmount();
  });
});
