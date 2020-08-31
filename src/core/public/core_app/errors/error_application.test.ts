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

import { act } from 'react-dom/test-utils';
import { History, createMemoryHistory } from 'history';
import { IBasePath } from '../../http';
import { BasePath } from '../../http/base_path';

import { renderApp } from './error_application';

describe('renderApp', () => {
  let basePath: IBasePath;
  let element: HTMLDivElement;
  let history: History;
  let unmount: any;

  beforeEach(() => {
    basePath = new BasePath();
    element = document.createElement('div');
    history = createMemoryHistory();
    unmount = renderApp({ element, history } as any, { basePath });
  });

  afterEach(() => unmount());

  it('renders generic errors', () => {
    act(() => {
      history.push('/app/error');
    });
    // innerText not working in jsdom, so use innerHTML
    expect(element.querySelector('.euiTitle')!.innerHTML).toMatchInlineSnapshot(
      `"Application error"`
    );
  });

  it('renders urlOverflow errors', () => {
    act(() => {
      history.push('/app/error?errorType=urlOverflow');
    });
    expect(element.querySelector('.euiTitle')!.innerHTML).toMatchInlineSnapshot(
      `"The URL for this object is too long, and we can't display it"`
    );
    expect(element.innerHTML).toMatch('Things to try');
  });
});
