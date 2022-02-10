/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockReactDomRender, mockReactDomUnmount } from './toasts_service.test.mocks';

import { ToastsService } from './toasts_service';
import { ToastsApi } from './toasts_api';
import { overlayServiceMock } from '../../overlays/overlay_service.mock';
import { themeServiceMock } from '../../theme/theme_service.mock';
import { uiSettingsServiceMock } from '../../ui_settings/ui_settings_service.mock';

const mockI18n: any = {
  Context: function I18nContext() {
    return '';
  },
};

const mockOverlays = overlayServiceMock.createStartContract();
const mockTheme = themeServiceMock.createStartContract();

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
    toasts.start({ i18n: mockI18n, theme: mockTheme, targetDomElement, overlays: mockOverlays });
    expect(mockReactDomRender.mock.calls).toMatchSnapshot();
  });

  it('returns a ToastsApi', () => {
    const targetDomElement = document.createElement('div');
    const toasts = new ToastsService();

    expect(
      toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() })
    ).toBeInstanceOf(ToastsApi);
    expect(
      toasts.start({ i18n: mockI18n, theme: mockTheme, targetDomElement, overlays: mockOverlays })
    ).toBeInstanceOf(ToastsApi);
  });
});

describe('#stop()', () => {
  it('unmounts the GlobalToastList from the targetDomElement', () => {
    const targetDomElement = document.createElement('div');
    targetDomElement.setAttribute('test', 'target-dom-element');
    const toasts = new ToastsService();

    toasts.setup({ uiSettings: uiSettingsServiceMock.createSetupContract() });
    toasts.start({ i18n: mockI18n, theme: mockTheme, targetDomElement, overlays: mockOverlays });

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
    toasts.start({ i18n: mockI18n, theme: mockTheme, targetDomElement, overlays: mockOverlays });
    toasts.stop();
    expect(targetDomElement.childNodes).toHaveLength(0);
  });
});
