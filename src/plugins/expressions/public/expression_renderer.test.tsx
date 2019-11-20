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
import { Subject } from 'rxjs';
import { share } from 'rxjs/operators';
import { ExpressionRendererImplementation } from './expression_renderer';
import { ExpressionLoader } from './loader';
import { mount } from 'enzyme';
import { EuiProgress } from '@elastic/eui';

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

    const instance = mount(<ExpressionRendererImplementation expression="" />);

    loadingSubject.next();
    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(1);

    renderSubject.next(1);

    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(0);

    instance.setProps({ expression: 'something new' });
    loadingSubject.next();
    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(1);

    renderSubject.next(1);
    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(0);
  });

  it('should display an error message when the expression fails', () => {
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

    const instance = mount(<ExpressionRendererImplementation expression="" />);

    dataSubject.next('good data');
    renderSubject.next({
      type: 'error',
      error: { message: 'render error' },
    });
    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(0);
    expect(instance.find('[data-test-subj="expression-renderer-error"]')).toHaveLength(1);
  });

  it('should display a custom error message if the user provides one', () => {
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

    const renderErrorFn = jest.fn().mockReturnValue(null);

    const instance = mount(
      <ExpressionRendererImplementation expression="" renderError={renderErrorFn} />
    );

    renderSubject.next({
      type: 'error',
      error: { message: 'render error' },
    });
    instance.update();

    expect(renderErrorFn).toHaveBeenCalledWith('render error');
  });
});
