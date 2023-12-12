/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  browsersSupportsSystemThemeMock,
  onSystemThemeChangeMock,
  systemThemeIsDarkMock,
  createStyleSheetMock,
} from './theme_service.test.mocks';

import { firstValueFrom } from 'rxjs';
import { injectedMetadataServiceMock } from '@kbn/core-injected-metadata-browser-mocks';
import { ThemeService } from './theme_service';

declare global {
  interface Window {
    __kbnThemeTag__: string;
  }
}

describe('ThemeService', () => {
  let themeService: ThemeService;
  let injectedMetadata: ReturnType<typeof injectedMetadataServiceMock.createSetupContract>;

  beforeEach(() => {
    themeService = new ThemeService();
    injectedMetadata = injectedMetadataServiceMock.createSetupContract();

    browsersSupportsSystemThemeMock.mockReset().mockReturnValue(true);
    systemThemeIsDarkMock.mockReset().mockReturnValue(false);
    onSystemThemeChangeMock.mockReset();
    createStyleSheetMock.mockReset();
  });

  describe('#setup', () => {
    describe('darkMode is `false`', () => {
      beforeEach(() => {
        injectedMetadata.getTheme.mockReturnValue({
          version: 'v8',
          darkMode: false,
          stylesheetPaths: {
            dark: ['dark-1.css'],
            default: ['light-1.css'],
          },
        });
      });

      it('exposed the correct `$theme` value from the observable', async () => {
        const { theme$ } = themeService.setup({ injectedMetadata });
        const theme = await firstValueFrom(theme$);
        expect(theme).toEqual({
          darkMode: false,
        });
      });

      it('sets __kbnThemeTag__ to the correct value', async () => {
        themeService.setup({ injectedMetadata });
        expect(window.__kbnThemeTag__).toEqual('v8light');
      });

      it('calls createStyleSheet with the correct parameters', async () => {
        themeService.setup({ injectedMetadata });
        expect(createStyleSheetMock).toHaveBeenCalledTimes(1);
        expect(createStyleSheetMock).toHaveBeenCalledWith({ href: 'light-1.css' });
      });

      it('does not call onSystemThemeChange', async () => {
        themeService.setup({ injectedMetadata });
        expect(onSystemThemeChangeMock).not.toHaveBeenCalled();
      });
    });

    describe('darkMode is `true`', () => {
      beforeEach(() => {
        injectedMetadata.getTheme.mockReturnValue({
          version: 'v8',
          darkMode: true,
          stylesheetPaths: {
            dark: ['dark-1.css'],
            default: ['light-1.css'],
          },
        });
      });

      it('exposed the correct `$theme` value from the observable', async () => {
        const { theme$ } = themeService.setup({ injectedMetadata });
        const theme = await firstValueFrom(theme$);
        expect(theme).toEqual({
          darkMode: true,
        });
      });

      it('sets __kbnThemeTag__ to the correct value', async () => {
        themeService.setup({ injectedMetadata });
        expect(window.__kbnThemeTag__).toEqual('v8dark');
      });

      it('calls createStyleSheet with the correct parameters', async () => {
        themeService.setup({ injectedMetadata });
        expect(createStyleSheetMock).toHaveBeenCalledTimes(1);
        expect(createStyleSheetMock).toHaveBeenCalledWith({ href: 'dark-1.css' });
      });

      it('does not call onSystemThemeChange', async () => {
        themeService.setup({ injectedMetadata });
        expect(onSystemThemeChangeMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('#start', () => {
    it('throws if called before `#setup`', () => {
      expect(() => {
        themeService.start();
      }).toThrowErrorMatchingInlineSnapshot(`"setup must be called before start"`);
    });

    it('exposes a `theme$` observable with the values provided by the injected metadata', async () => {
      injectedMetadata.getTheme.mockReturnValue({
        version: 'v8',
        darkMode: true,
        stylesheetPaths: {
          dark: [],
          default: [],
        },
      });
      themeService.setup({ injectedMetadata });
      const { theme$ } = themeService.start();
      const theme = await firstValueFrom(theme$);
      expect(theme).toEqual({
        darkMode: true,
      });
    });
  });
});
