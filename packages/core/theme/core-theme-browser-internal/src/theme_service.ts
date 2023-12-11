/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject, ReplaySubject } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';
import type { InjectedMetadataTheme } from '@kbn/core-injected-metadata-common-internal';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { CoreTheme, ThemeServiceSetup, ThemeServiceStart } from '@kbn/core-theme-browser';

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

    if (theme.darkMode === 'system' && browsersSupportsPrefersColorScheme()) {
      const darkMode = systemIsDark();
      this.applyTheme(darkMode);
      onSystemPrefersColorSchemeChange((mode) => this.applyTheme(mode));
    } else {
      // if browser doesn't support required capabilities we fallback to default theme
      const darkMode = theme.darkMode === 'system' ? false : toBoolean(theme.darkMode);
      this.applyTheme(darkMode);
    }

    return {
      theme$: this.theme$.pipe(takeUntil(this.stop$), shareReplay(1)),
    };
  }

  public start(): ThemeServiceStart {
    if (!this.theme$) {
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

    this.theme$.next({ darkMode });
  }
}

const createStyleSheet = ({ href }: { href: string }) => {
  const head = document.getElementsByTagName('head')[0];
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  link.media = 'all';
  head.appendChild(link);
  return link;
};

const systemIsDark = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const onSystemPrefersColorSchemeChange = (handler: (darkMode: boolean) => void) => {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    handler(e.matches);
  });
};

const browsersSupportsPrefersColorScheme = (): boolean => {
  try {
    const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    return matchMedia.matches !== undefined && matchMedia.addEventListener !== undefined;
  } catch (e) {
    return false;
  }
};

const toBoolean = (val: string | boolean): boolean => {
  if (val === true || val === 'true') {
    return true;
  }
  if (val === false || val === 'false') {
    return false;
  }
  return Boolean(val);
};
