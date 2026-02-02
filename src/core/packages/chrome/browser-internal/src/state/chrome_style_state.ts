/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { distinctUntilChanged, filter, shareReplay } from 'rxjs';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { createState, type State } from './state_helpers';

export interface ChromeStyleState {
  chromeStyle: State<ChromeStyle | undefined>;
  chromeStyle$: Observable<ChromeStyle>;
  setChromeStyle: (style: ChromeStyle) => void;
}

export const createChromeStyleState = (): ChromeStyleState => {
  // ChromeStyle is set to undefined by default, which means that no header will be rendered until
  // setChromeStyle(). This is to avoid a flickering between the "classic" and "project" header meanwhile
  // we load the user profile to check if the user opted out of the new solution navigation.
  const chromeStyle = createState<ChromeStyle | undefined>(undefined);

  const chromeStyle$ = chromeStyle.$.pipe(
    filter((style): style is ChromeStyle => style !== undefined),
    distinctUntilChanged(),
    shareReplay(1)
  );

  const setChromeStyle = (style: ChromeStyle) => {
    if (style === chromeStyle.get()) return;
    chromeStyle.set(style);
  };

  return {
    chromeStyle,
    chromeStyle$,
    setChromeStyle,
  };
};
