/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject, ReplaySubject } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';
import { _setDarkMode } from '@kbn/ui-theme';
import type { InjectedMetadataTheme } from '@kbn/core-injected-metadata-common-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { CoreTheme, ThemeServiceSetup, ThemeServiceStart } from '@kbn/core-theme-browser';
import {
  systemThemeIsDark,
  onSystemThemeChange,
  browsersSupportsSystemTheme,
} from './system_theme';
import { createStyleSheet } from './utils';

/** @internal */
export interface ThemeServiceSetupDeps {
  injectedMetadata: InternalInjectedMetadataSetup;
}

/** @internal */
export class ThemeService {
  private theme$ = new ReplaySubject<CoreTheme>(1);
  private stop$ = new Subject<void>();

  private themeMetadata?: InjectedMetadataTheme;
  private stylesheets: HTMLLinkElement[] = [];

  public setup({ injectedMetadata }: ThemeServiceSetupDeps): ThemeServiceSetup {
    const theme = injectedMetadata.getTheme();
    this.themeMetadata = theme;

    if (theme.darkMode === 'system' && browsersSupportsSystemTheme()) {
      const darkMode = systemThemeIsDark();
      this.applyTheme(darkMode);
      onSystemThemeChange((mode) => this.applyTheme(mode));
    } else {
      const darkMode = theme.darkMode === 'system' ? false : theme.darkMode;
      this.applyTheme(darkMode);
    }

    return {
      theme$: this.theme$.pipe(takeUntil(this.stop$), shareReplay(1)),
    };
  }

  public start(): ThemeServiceStart {
    if (!this.themeMetadata) {
      throw new Error('setup must be called before start');
    }

    return {
      theme$: this.theme$.pipe(takeUntil(this.stop$), shareReplay(1)),
    };
  }

  public stop() {
    this.stop$.next();
  }

  private applyTheme(darkMode: boolean) {
    this.stylesheets.forEach((stylesheet) => {
      stylesheet.remove();
    });
    this.stylesheets = [];
    const newStylesheets = darkMode
      ? this.themeMetadata!.stylesheetPaths.dark
      : this.themeMetadata!.stylesheetPaths.default;

    newStylesheets.forEach((stylesheet) => {
      this.stylesheets.push(createStyleSheet({ href: stylesheet }));
    });

    _setDarkMode(darkMode);
    updateKbnThemeTag(darkMode);
    this.theme$.next({ darkMode });
  }
}

const updateKbnThemeTag = (darkMode: boolean) => {
  const globals: any = typeof window === 'undefined' ? {} : window;
  globals.__kbnThemeTag__ = darkMode ? 'v8dark' : 'v8light';
};
