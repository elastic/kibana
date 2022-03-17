/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { renderHook, act } from '@testing-library/react-hooks';
import { render, act as renderAct } from '@testing-library/react';

import { LIGHT_THEME, DARK_THEME } from '@elastic/charts';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';

import { ThemeService } from './theme';
import { coreMock } from '../../../../../core/public/mocks';

const { uiSettings: setupMockUiSettings } = coreMock.createSetup();

describe('ThemeService', () => {
  describe('darkModeEnabled$', () => {
    it('should throw error if service has not been initialized', () => {
      const themeService = new ThemeService();
      expect(() => themeService.darkModeEnabled$).toThrowError();
    });

    it('returns the false when not in dark mode', async () => {
      setupMockUiSettings.get$.mockReturnValue(new BehaviorSubject(false));
      const themeService = new ThemeService();
      themeService.init(setupMockUiSettings);

      expect(await themeService.darkModeEnabled$.pipe(take(1)).toPromise()).toBe(false);
    });

    it('returns the true when in dark mode', async () => {
      setupMockUiSettings.get$.mockReturnValue(new BehaviorSubject(true));
      const themeService = new ThemeService();
      themeService.init(setupMockUiSettings);

      expect(await themeService.darkModeEnabled$.pipe(take(1)).toPromise()).toBe(true);
    });
  });

  describe('chartsTheme$', () => {
    it('returns the light theme when not in dark mode', async () => {
      setupMockUiSettings.get$.mockReturnValue(new BehaviorSubject(false));
      const themeService = new ThemeService();
      themeService.init(setupMockUiSettings);

      expect(await themeService.chartsTheme$.pipe(take(1)).toPromise()).toEqual(
        EUI_CHARTS_THEME_LIGHT.theme
      );
    });

    describe('in dark mode', () => {
      it(`returns the dark theme`, async () => {
        // Fake dark theme turned returning true
        setupMockUiSettings.get$.mockReturnValue(new BehaviorSubject(true));
        const themeService = new ThemeService();
        themeService.init(setupMockUiSettings);

        expect(await themeService.chartsTheme$.pipe(take(1)).toPromise()).toEqual(
          EUI_CHARTS_THEME_DARK.theme
        );
      });
    });
  });

  describe('chartsBaseTheme$', () => {
    it('returns the light theme when not in dark mode', async () => {
      setupMockUiSettings.get$.mockReturnValue(new BehaviorSubject(false));
      const themeService = new ThemeService();
      themeService.init(setupMockUiSettings);

      expect(await themeService.chartsBaseTheme$.pipe(take(1)).toPromise()).toEqual(LIGHT_THEME);
    });

    describe('in dark mode', () => {
      it(`returns the dark theme`, async () => {
        // Fake dark theme turned returning true
        setupMockUiSettings.get$.mockReturnValue(new BehaviorSubject(true));
        const themeService = new ThemeService();
        themeService.init(setupMockUiSettings);
        const result = await themeService.chartsBaseTheme$.pipe(take(1)).toPromise();

        expect(result).toEqual(DARK_THEME);
      });
    });
  });

  describe('useChartsTheme', () => {
    it('updates when the uiSettings change', () => {
      const darkMode$ = new BehaviorSubject(false);
      setupMockUiSettings.get$.mockReturnValue(darkMode$);
      const themeService = new ThemeService();
      themeService.init(setupMockUiSettings);
      const { useChartsTheme } = themeService;

      const { result } = renderHook(() => useChartsTheme());
      expect(result.current).toBe(EUI_CHARTS_THEME_LIGHT.theme);

      act(() => darkMode$.next(true));
      expect(result.current).toBe(EUI_CHARTS_THEME_DARK.theme);
      act(() => darkMode$.next(false));
      expect(result.current).toBe(EUI_CHARTS_THEME_LIGHT.theme);
    });

    it('should not rerender when emitting the same value', () => {
      const darkMode$ = new BehaviorSubject(false);
      setupMockUiSettings.get$.mockReturnValue(darkMode$);
      const themeService = new ThemeService();
      themeService.init(setupMockUiSettings);
      const { useChartsTheme } = themeService;

      const renderCounter = jest.fn();
      const Wrapper = () => {
        useChartsTheme();
        renderCounter();
        return null;
      };

      render(<Wrapper />);
      expect(renderCounter).toHaveBeenCalledTimes(1);
      renderAct(() => darkMode$.next(true));
      expect(renderCounter).toHaveBeenCalledTimes(2);
      renderAct(() => darkMode$.next(true));
      renderAct(() => darkMode$.next(true));
      renderAct(() => darkMode$.next(true));
      expect(renderCounter).toHaveBeenCalledTimes(2);
    });
  });

  describe('useBaseChartTheme', () => {
    it('updates when the uiSettings change', () => {
      const darkMode$ = new BehaviorSubject(false);
      setupMockUiSettings.get$.mockReturnValue(darkMode$);
      const themeService = new ThemeService();
      themeService.init(setupMockUiSettings);
      const { useChartsBaseTheme } = themeService;

      const { result } = renderHook(() => useChartsBaseTheme());
      expect(result.current).toBe(LIGHT_THEME);

      act(() => darkMode$.next(true));
      expect(result.current).toBe(DARK_THEME);
      act(() => darkMode$.next(false));
      expect(result.current).toBe(LIGHT_THEME);
    });

    it('should not rerender when emitting the same value', () => {
      const darkMode$ = new BehaviorSubject(false);
      setupMockUiSettings.get$.mockReturnValue(darkMode$);
      const themeService = new ThemeService();
      themeService.init(setupMockUiSettings);
      const { useChartsBaseTheme } = themeService;

      const renderCounter = jest.fn();
      const Wrapper = () => {
        useChartsBaseTheme();
        renderCounter();
        return null;
      };

      render(<Wrapper />);
      expect(renderCounter).toHaveBeenCalledTimes(1);
      renderAct(() => darkMode$.next(true));
      expect(renderCounter).toHaveBeenCalledTimes(2);
      renderAct(() => darkMode$.next(true));
      renderAct(() => darkMode$.next(true));
      renderAct(() => darkMode$.next(true));
      expect(renderCounter).toHaveBeenCalledTimes(2);
    });
  });
});
