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

import { mockReactDomRender, mockReactDomUnmount } from './toasts_service.test.mocks';

import { ToastsService } from './toasts_service';
import { ToastsSetup } from './toasts_start';

const mockI18n: any = {
  Context: function I18nContext() {
    return '';
  },
};

describe('#setup()', () => {
  it('renders the GlobalToastList into the targetDomElement param', async () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService({ targetDomElement });

    expect(mockReactDomRender).not.toHaveBeenCalled();
    toasts.setup({ i18n: mockI18n });
    expect(mockReactDomRender.mock.calls).toMatchSnapshot();
  });

  it('returns a ToastsSetup', () => {
    const toasts = new ToastsService({
      targetDomElement: document.createElement('div'),
    });

    expect(toasts.setup({ i18n: mockI18n })).toBeInstanceOf(ToastsSetup);
  });
});

describe('#stop()', () => {
  it('unmounts the GlobalToastList from the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService({ targetDomElement });

    toasts.setup({ i18n: mockI18n });

    expect(mockReactDomUnmount).not.toHaveBeenCalled();
    toasts.stop();
    expect(mockReactDomUnmount.mock.calls).toMatchSnapshot();
  });

  it('does not fail if setup() was never called', () => {
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
