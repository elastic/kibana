/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  browsersSupportsSystemThemeMock,
  onSystemThemeChangeMock,
  systemThemeIsDarkMock,
  createStyleSheetMock,
  setDarkModeMock,
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
    createStyleSheetMock.mockReset().mockReturnValue({ remove: jest.fn() });
    setDarkModeMock.mockReset();
  });

  describe('#setup', () => {
    describe('darkMode is `false`', () => {
      beforeEach(() => {
        injectedMetadata.getTheme.mockReturnValue({
          version: 'v8',
          name: 'amsterdam',
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
          name: 'amsterdam',
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

      it('calls _setDarkMode with the correct parameters', async () => {
        themeService.setup({ injectedMetadata });
        expect(setDarkModeMock).toHaveBeenCalledTimes(1);
        expect(setDarkModeMock).toHaveBeenCalledWith(false);
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
          name: 'amsterdam',
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
          name: 'amsterdam',
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

      it('calls _setDarkMode with the correct parameters', async () => {
        themeService.setup({ injectedMetadata });
        expect(setDarkModeMock).toHaveBeenCalledTimes(1);
        expect(setDarkModeMock).toHaveBeenCalledWith(true);
      });

      it('does not call onSystemThemeChange', async () => {
        themeService.setup({ injectedMetadata });
        expect(onSystemThemeChangeMock).not.toHaveBeenCalled();
      });
    });

    describe('darkMode is `system`', () => {
      beforeEach(() => {
        injectedMetadata.getTheme.mockReturnValue({
          version: 'v8',
          name: 'amsterdam',
          darkMode: 'system',
          stylesheetPaths: {
            dark: ['dark-1.css'],
            default: ['light-1.css'],
          },
        });
      });

      describe('when browser does not support system theme', () => {
        beforeEach(() => {
          browsersSupportsSystemThemeMock.mockReturnValue(false);
        });

        it('fallbacks to default light theme', async () => {
          const { theme$ } = themeService.setup({ injectedMetadata });
          const theme = await firstValueFrom(theme$);

          expect(theme).toEqual({
            darkMode: false,
            name: 'amsterdam',
          });

          expect(window.__kbnThemeTag__).toEqual('v8light');

          expect(setDarkModeMock).toHaveBeenCalledTimes(1);
          expect(setDarkModeMock).toHaveBeenCalledWith(false);

          expect(createStyleSheetMock).toHaveBeenCalledTimes(1);
          expect(createStyleSheetMock).toHaveBeenCalledWith({ href: 'light-1.css' });

          expect(onSystemThemeChangeMock).not.toHaveBeenCalled();
        });
      });

      describe('when browser supports system theme', () => {
        beforeEach(() => {
          browsersSupportsSystemThemeMock.mockReturnValue(true);
        });

        it('uses the system theme when light', async () => {
          systemThemeIsDarkMock.mockReturnValue(false);

          const { theme$ } = themeService.setup({ injectedMetadata });
          const theme = await firstValueFrom(theme$);

          expect(theme).toEqual({
            darkMode: false,
            name: 'amsterdam',
          });

          expect(window.__kbnThemeTag__).toEqual('v8light');

          expect(setDarkModeMock).toHaveBeenCalledTimes(1);
          expect(setDarkModeMock).toHaveBeenCalledWith(false);

          expect(createStyleSheetMock).toHaveBeenCalledTimes(1);
          expect(createStyleSheetMock).toHaveBeenCalledWith({ href: 'light-1.css' });
        });

        it('uses the system theme when dark', async () => {
          systemThemeIsDarkMock.mockReturnValue(true);

          const { theme$ } = themeService.setup({ injectedMetadata });
          const theme = await firstValueFrom(theme$);

          expect(theme).toEqual({
            darkMode: true,
            name: 'amsterdam',
          });

          expect(window.__kbnThemeTag__).toEqual('v8dark');

          expect(setDarkModeMock).toHaveBeenCalledTimes(1);
          expect(setDarkModeMock).toHaveBeenCalledWith(true);

          expect(createStyleSheetMock).toHaveBeenCalledTimes(1);
          expect(createStyleSheetMock).toHaveBeenCalledWith({ href: 'dark-1.css' });
        });

        // unsupported and disabled for now
        it.skip('reacts to system theme change', async () => {
          systemThemeIsDarkMock.mockReturnValue(false);

          let handler: (mode: boolean) => void;
          onSystemThemeChangeMock.mockImplementation((_handler: (mode: boolean) => void) => {
            handler = _handler;
          });

          const { theme$ } = themeService.setup({ injectedMetadata });

          expect(await firstValueFrom(theme$)).toEqual({
            darkMode: false,
          });
          expect(window.__kbnThemeTag__).toEqual('v8light');

          handler!(true);

          expect(await firstValueFrom(theme$)).toEqual({
            darkMode: true,
          });
          expect(window.__kbnThemeTag__).toEqual('v8dark');
        });
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
        name: 'amsterdam',
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
        name: 'amsterdam',
      });
    });
  });
});
