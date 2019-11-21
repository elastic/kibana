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
import { ToastsApi } from './toasts_api';
import { overlayServiceMock } from '../../overlays/overlay_service.mock';
import { uiSettingsServiceMock } from '../../ui_settings/ui_settings_service.mock';

const mockI18n: any = {
  Context: function I18nContext() {
    return '';
  },
};

const mockOverlays = overlayServiceMock.createStartContract();

describe('#setup()', () => {
  it('returns a ToastsApi', () => {
    const toasts = new ToastsService();

    expect(
      toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() })
    ).toBeInstanceOf(ToastsApi);
  });
});

describe('#start()', () => {
  it('renders the GlobalToastList into the targetDomElement param', async () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService();

    expect(mockReactDomRender).not.toHaveBeenCalled();
    toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() });
    toasts.start({ i18n: mockI18n, targetDomElement, overlays: mockOverlays });
    expect(mockReactDomRender.mock.calls).toMatchSnapshot();
  });

  it('returns a ToastsApi', () => {
    const targetDomElement = document.createElement('div');
    const toasts = new ToastsService();

    expect(
      toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() })
    ).toBeInstanceOf(ToastsApi);
    expect(
      toasts.start({ i18n: mockI18n, targetDomElement, overlays: mockOverlays })
    ).toBeInstanceOf(ToastsApi);
  });
});

describe('#stop()', () => {
  it('unmounts the GlobalToastList from the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService();

    toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() });
    toasts.start({ i18n: mockI18n, targetDomElement, overlays: mockOverlays });

    expect(mockReactDomUnmount).not.toHaveBeenCalled();
    toasts.stop();
    expect(mockReactDomUnmount.mock.calls).toMatchSnapshot();
  });

  it('does not fail if setup() was never called', () => {
    const toasts = new ToastsService();
    expect(() => {
      toasts.stop();
    }).not.toThrowError();
  });

  it('empties the content of the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    const toasts = new ToastsService();

    toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() });
    toasts.start({ i18n: mockI18n, targetDomElement, overlays: mockOverlays });
    toasts.stop();
    expect(targetDomElement.childNodes).toHaveLength(0);
  });
});
