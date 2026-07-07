/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { _setDarkMode } from '@kbn/ui-theme';
import type { InjectedMetadataTheme } from '@kbn/core-injected-metadata-common-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { InternalThemeServiceStart } from '@kbn/core-theme-browser-internal-types';
import { systemThemeIsDark, browsersSupportsSystemTheme } from './system_theme';
import { createStyleSheet } from './utils';

/** @internal */
export interface ThemeServiceSetupDeps {
  injectedMetadata: InternalInjectedMetadataSetup;
}

/** @internal */
export class ThemeService {
  private contract?: InternalThemeServiceStart;
  private themeMetadata?: InjectedMetadataTheme;
  private stylesheets: HTMLLinkElement[] = [];
  private theme$?: BehaviorSubject<CoreTheme>;

  public setup({ injectedMetadata }: ThemeServiceSetupDeps): InternalThemeServiceStart {
    const themeMetadata = injectedMetadata.getTheme();

    this.themeMetadata = themeMetadata;

    let darkMode: boolean;
    if (themeMetadata.darkMode === 'system' && browsersSupportsSystemTheme()) {
      darkMode = systemThemeIsDark();
    } else {
      darkMode = themeMetadata.darkMode === 'system' ? false : themeMetadata.darkMode;
    }

    const theme: CoreTheme = {
      darkMode,
      name: themeMetadata.name,
    };

    this.applyTheme(theme);

    const theme$ = new BehaviorSubject<CoreTheme>(theme);
    this.theme$ = theme$;

    this.contract = {
      getTheme: () => theme$.getValue(),
      theme$: theme$.asObservable(),
      setDarkMode: (nextDarkMode: boolean) => {
        const current = theme$.getValue();
        if (current.darkMode === nextDarkMode) {
          return;
        }
        const nextTheme: CoreTheme = { ...current, darkMode: nextDarkMode };
        this.applyTheme(nextTheme);
        theme$.next(nextTheme);
      },
    };

    return this.contract;
  }

  public start(): InternalThemeServiceStart {
    if (!this.contract) {
      throw new Error('setup must be called before start');
    }

    return this.contract;
  }

  public stop() {
    this.theme$?.complete();
  }

  private applyTheme(theme: CoreTheme) {
    const { darkMode } = theme;
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
    updateKbnThemeTag(theme);
  }
}

const updateKbnThemeTag = (theme: CoreTheme) => {
  const globals: any = typeof window === 'undefined' ? {} : window;
  globals.__kbnThemeTag__ = `${theme.name}${theme.darkMode ? 'dark' : 'light'}`;
};
