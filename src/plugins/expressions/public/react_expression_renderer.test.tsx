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

import React from 'react';
import { act } from 'react-dom/test-utils';
import { Subject } from 'rxjs';
import { share } from 'rxjs/operators';
import { ReactExpressionRenderer } from './react_expression_renderer';
import { ExpressionLoader } from './loader';
import { mount } from 'enzyme';
import { EuiProgress } from '@elastic/eui';
import { RenderErrorHandlerFnType } from './types';
import { ExpressionRendererEvent } from './render';

jest.mock('./loader', () => {
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
    const loadingSubject = new Subject();
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

    const instance = mount(<ReactExpressionRenderer reload$={refreshSubject} expression="" />);

    act(() => {
      refreshSubject.next();
    });

    expect(loaderUpdate).toHaveBeenCalled();

    instance.unmount();
  });

  it('should display a custom error message if the user provides one and then remove it after successful render', () => {
    const dataSubject = new Subject();
    const data$ = dataSubject.asObservable().pipe(share());
    const renderSubject = new Subject();
    const render$ = renderSubject.asObservable().pipe(share());
    const loadingSubject = new Subject();
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
      } as any);
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
});
