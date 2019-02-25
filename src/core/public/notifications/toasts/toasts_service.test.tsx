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

const mockReactDomRender = jest.fn();
const mockReactDomUnmount = jest.fn();
jest.mock('react-dom', () => ({
  render: mockReactDomRender,
  unmountComponentAtNode: mockReactDomUnmount,
}));

import { ToastsService } from './toasts_service';
import { ToastsStartContract } from './toasts_start_contract';

const mockI18nContract: any = {
  Context: function I18nContext() {
    return '';
  },
};

describe('#start()', () => {
  it('renders the GlobalToastList into the targetDomElement param', async () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService({ targetDomElement });

    expect(mockReactDomRender).not.toHaveBeenCalled();
    toasts.start({ i18n: mockI18nContract });
    expect(mockReactDomRender.mock.calls).toMatchSnapshot();
  });

  it('returns a ToastsStartContract', () => {
    const toasts = new ToastsService({
      targetDomElement: document.createElement('div'),
    });

    expect(toasts.start({ i18n: mockI18nContract })).toBeInstanceOf(ToastsStartContract);
  });
});

describe('#stop()', () => {
  it('unmounts the GlobalToastList from the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService({ targetDomElement });

    toasts.start({ i18n: mockI18nContract });

    expect(mockReactDomUnmount).not.toHaveBeenCalled();
    toasts.stop();
    expect(mockReactDomUnmount.mock.calls).toMatchSnapshot();
  });

  it('does not fail if start() was never called', () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService({ targetDomElement });
    expect(() => {
      toasts.stop();
    }).not.toThrowError();
  });

  it('empties the content of the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    const toasts = new ToastsService({ targetDomElement });

    targetDomElement.appendChild(document.createTextNode('foo bar'));
    toasts.stop();
    expect(targetDomElement.childNodes).toHaveLength(0);
  });
});
