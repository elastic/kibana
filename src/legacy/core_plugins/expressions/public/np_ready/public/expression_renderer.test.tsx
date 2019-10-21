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

    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$,
        data$,
        update: jest.fn(),
      };
    });

    const instance = mount(<ExpressionRendererImplementation className="renderer" expression="" />);

    expect(instance.find(EuiProgress)).toHaveLength(1);

    dataSubject.next('data');
    renderSubject.next(1);

    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(0);

    instance.setProps({ expression: 'something new' });
    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(1);

    renderSubject.next(1);
    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(0);
  });

  it('should display a default error message when the expression fails', () => {
    const dataSubject = new Subject();
    const data$ = dataSubject.asObservable().pipe(share());
    const renderSubject = new Subject();
    const render$ = renderSubject.asObservable().pipe(share());

    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$,
        data$,
        update: jest.fn(),
      };
    });

    const instance = mount(<ExpressionRendererImplementation className="renderer" expression="" />);

    dataSubject.error('data error');
    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(0);
    expect(instance.find('[data-test-subj="expression-renderer-error"]')).toHaveLength(1);

    renderSubject.next(1);
    dataSubject.next('good data');
    renderSubject.error('render error');
    instance.update();

    expect(instance.find(EuiProgress)).toHaveLength(0);
    expect(instance.find('[data-test-subj="expression-renderer-error"]')).toHaveLength(1);
  });

  it('should display a custom error message if the user provides one', () => {
    const dataSubject = new Subject();
    const data$ = dataSubject.asObservable().pipe(share());
    const renderSubject = new Subject();
    const render$ = renderSubject.asObservable().pipe(share());

    (ExpressionLoader as jest.Mock).mockImplementation(() => {
      return {
        render$,
        data$,
        update: jest.fn(),
      };
    });

    const renderErrorFn = jest.fn().mockReturnValue(null);

    const instance = mount(
      <ExpressionRendererImplementation
        className="renderer"
        expression=""
        renderError={renderErrorFn}
      />
    );

    dataSubject.error('data error');
    instance.update();

    expect(renderErrorFn).toHaveBeenCalledWith('data', 'data error');

    renderSubject.error('render error');
    instance.update();

    expect(renderErrorFn).toHaveBeenLastCalledWith('render', 'render error');
  });
});
