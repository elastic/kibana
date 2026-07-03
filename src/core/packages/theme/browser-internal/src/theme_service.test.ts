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
import type { CoreTheme } from '@kbn/core-theme-browser';
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
          name: 'borealis',
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
          name: 'borealis',
        });
      });

      it('sets __kbnThemeTag__ to the correct value', async () => {
        themeService.setup({ injectedMetadata });
        expect(window.__kbnThemeTag__).toEqual('borealislight');
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
          name: 'borealis',
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
          name: 'borealis',
        });
      });

      it('sets __kbnThemeTag__ to the correct value', async () => {
        themeService.setup({ injectedMetadata });
        expect(window.__kbnThemeTag__).toEqual('borealisdark');
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
          name: 'borealis',
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
            name: 'borealis',
          });

          expect(window.__kbnThemeTag__).toEqual('borealislight');

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
            name: 'borealis',
          });

          expect(window.__kbnThemeTag__).toEqual('borealislight');

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
            name: 'borealis',
          });

          expect(window.__kbnThemeTag__).toEqual('borealisdark');

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
          expect(window.__kbnThemeTag__).toEqual('borealislight');

          handler!(true);

          expect(await firstValueFrom(theme$)).toEqual({
            darkMode: true,
          });
          expect(window.__kbnThemeTag__).toEqual('borealisdark');
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
        name: 'borealis',
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
        name: 'borealis',
      });
    });
  });

  describe('#setDarkMode', () => {
    beforeEach(() => {
      // base theme is light; `dark-1.css` / `light-1.css` let us assert stylesheet swaps
      injectedMetadata.getTheme.mockReturnValue({
        version: 'v8',
        name: 'borealis',
        darkMode: false,
        stylesheetPaths: {
          dark: ['dark-1.css'],
          default: ['light-1.css'],
        },
      });
    });

    it('applies the new theme when switching from light to dark', () => {
      const { setDarkMode, getTheme } = themeService.setup({ injectedMetadata });

      // ignore the side effects performed during setup itself
      setDarkModeMock.mockClear();
      createStyleSheetMock.mockClear();

      setDarkMode(true);

      expect(setDarkModeMock).toHaveBeenCalledTimes(1);
      expect(setDarkModeMock).toHaveBeenCalledWith(true);

      expect(createStyleSheetMock).toHaveBeenCalledTimes(1);
      expect(createStyleSheetMock).toHaveBeenCalledWith({ href: 'dark-1.css' });

      expect(window.__kbnThemeTag__).toEqual('borealisdark');
      expect(getTheme()).toEqual({ darkMode: true, name: 'borealis' });
    });

    it('emits the updated theme on `theme$`', () => {
      const { setDarkMode, theme$ } = themeService.setup({ injectedMetadata });

      const emissions: CoreTheme[] = [];
      const subscription = theme$.subscribe((theme) => emissions.push(theme));

      setDarkMode(true);

      expect(emissions).toEqual([
        { darkMode: false, name: 'borealis' },
        { darkMode: true, name: 'borealis' },
      ]);

      subscription.unsubscribe();
    });

    it('is a no-op when the requested mode matches the current one', () => {
      const { setDarkMode, theme$ } = themeService.setup({ injectedMetadata });

      setDarkModeMock.mockClear();
      createStyleSheetMock.mockClear();

      let emissionCount = 0;
      const subscription = theme$.subscribe(() => emissionCount++);
      // BehaviorSubject replays the current value on subscription
      expect(emissionCount).toBe(1);

      setDarkMode(false);

      expect(setDarkModeMock).not.toHaveBeenCalled();
      expect(createStyleSheetMock).not.toHaveBeenCalled();
      expect(emissionCount).toBe(1);

      subscription.unsubscribe();
    });
  });

  describe('#stop', () => {
    it('completes the `theme$` observable', () => {
      injectedMetadata.getTheme.mockReturnValue({
        version: 'v8',
        name: 'borealis',
        darkMode: false,
        stylesheetPaths: {
          dark: [],
          default: [],
        },
      });

      const { theme$ } = themeService.setup({ injectedMetadata });

      let completed = false;
      theme$.subscribe({ complete: () => (completed = true) });

      themeService.stop();

      expect(completed).toBe(true);
    });
  });
});
