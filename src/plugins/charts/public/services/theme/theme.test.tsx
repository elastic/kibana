/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { from } from 'rxjs';
import { take } from 'rxjs';
import { render, act as renderAct, renderHook, act } from '@testing-library/react';

import { LIGHT_THEME, DARK_THEME } from '@elastic/charts';

import { ThemeService } from './theme';
import { coreMock } from '@kbn/core/public/mocks';

const createTheme$Mock = (mode: boolean) => {
  return from([{ darkMode: mode, name: 'amsterdam' }]);
};

const { theme: setUpMockTheme } = coreMock.createSetup();

describe('ThemeService', () => {
  describe('darkModeEnabled$', () => {
    it('should throw error if service has not been initialized', () => {
      const themeService = new ThemeService();
      expect(() => themeService.darkModeEnabled$).toThrowError();
    });

    it('returns the false when not in dark mode', async () => {
      const themeService = new ThemeService();
      themeService.init(setUpMockTheme);

      expect(await themeService.darkModeEnabled$.pipe(take(1)).toPromise()).toStrictEqual({
        darkMode: false,
        name: 'amsterdam',
      });
    });

    it('returns the true when in dark mode', async () => {
      setUpMockTheme.theme$ = createTheme$Mock(true);
      const themeService = new ThemeService();
      themeService.init(setUpMockTheme);

      expect(await themeService.darkModeEnabled$.pipe(take(1)).toPromise()).toStrictEqual({
        darkMode: true,
        name: 'amsterdam',
      });
    });
  });

  describe('chartsBaseTheme$', () => {
    it('returns the light theme when not in dark mode', async () => {
      setUpMockTheme.theme$ = createTheme$Mock(false);
      const themeService = new ThemeService();
      themeService.init(setUpMockTheme);

      expect(await themeService.chartsBaseTheme$.pipe(take(1)).toPromise()).toEqual(LIGHT_THEME);
    });

    describe('in dark mode', () => {
      it(`returns the dark theme`, async () => {
        // Fake dark theme turned returning true
        setUpMockTheme.theme$ = createTheme$Mock(true);
        const themeService = new ThemeService();
        themeService.init(setUpMockTheme);
        const result = await themeService.chartsBaseTheme$.pipe(take(1)).toPromise();

        expect(result).toEqual(DARK_THEME);
      });
    });
  });

  describe('useBaseChartTheme', () => {
    it('updates when the theme setting change', () => {
      setUpMockTheme.theme$ = createTheme$Mock(false);
      const themeService = new ThemeService();
      themeService.init(setUpMockTheme);
      const { useChartsBaseTheme } = themeService;

      const { result } = renderHook(() => useChartsBaseTheme());
      expect(result.current).toStrictEqual(LIGHT_THEME);

      act(() => {
        setUpMockTheme.theme$ = createTheme$Mock(true);
        themeService.init(setUpMockTheme);
      });
      expect(result.current).toStrictEqual(DARK_THEME);
      act(() => {
        setUpMockTheme.theme$ = createTheme$Mock(false);
        themeService.init(setUpMockTheme);
      });
      // act(() => darkMode$.next(false));
      expect(result.current).toStrictEqual(LIGHT_THEME);
    });

    it('should not rerender when emitting the same value', () => {
      setUpMockTheme.theme$ = createTheme$Mock(false);
      const themeService = new ThemeService();
      themeService.init(setUpMockTheme);
      const { useChartsBaseTheme } = themeService;

      const renderCounter = jest.fn();
      const Wrapper = () => {
        useChartsBaseTheme();
        renderCounter();
        return null;
      };

      render(<Wrapper />);
      expect(renderCounter).toHaveBeenCalledTimes(1);
      renderAct(() => {
        setUpMockTheme.theme$ = createTheme$Mock(true);
        themeService.init(setUpMockTheme);
      });
      expect(renderCounter).toHaveBeenCalledTimes(2);
      renderAct(() => {
        setUpMockTheme.theme$ = createTheme$Mock(true);
        themeService.init(setUpMockTheme);
      });
      renderAct(() => {
        setUpMockTheme.theme$ = createTheme$Mock(true);
        themeService.init(setUpMockTheme);
      });
      expect(renderCounter).toHaveBeenCalledTimes(4);
    });
  });
});
