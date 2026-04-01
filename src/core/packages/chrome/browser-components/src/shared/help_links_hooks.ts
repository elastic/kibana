/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { Observable } from 'rxjs';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import equal from 'fast-deep-equal';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useChromeStyle } from '@kbn/core-chrome-browser-hooks';
import type { HelpLinks } from './help_menu_links';
import { buildHelpLinks } from './help_menu_links';
import { useChromeComponentsDeps } from '../context';

/**
 * Returns an observable of pre-built help menu link groups for the given chrome style.
 * Used by both `HeaderHelpMenu` (via `useObservable`) and the project sidenav (via `combineLatest`).
 */
export function useHelpLinks$(): Observable<HelpLinks> {
  const chrome = useChromeService();
  const chromeStyle = useChromeStyle();
  const docLinks = useChromeComponentsDeps().docLinks;
  return useMemo(
    () =>
      combineLatest([
        chrome.getHelpMenuLinks$(),
        chrome.getHelpExtension$(),
        chrome.getHelpSupportUrl$(),
        chrome.getGlobalHelpExtensionMenuLinks$(),
      ]).pipe(
        map(([menuLinks, extension, supportUrl, globalExtensionMenuLinks]) =>
          buildHelpLinks({
            chromeStyle,
            helpData: { menuLinks, extension, supportUrl, globalExtensionMenuLinks, docLinks },
          })
        ),
        distinctUntilChanged(equal)
      ),
    [chrome, chromeStyle, docLinks]
  );
}

export function useHelpLinks(): HelpLinks {
  const helpLinks$ = useHelpLinks$();
  return useObservable(helpLinks$, { global: [], default: [] });
}
