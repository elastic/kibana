/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { distinctUntilChanged, shareReplay } from 'rxjs';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import { createState, type State } from './state_helpers';

export interface ChromeStyleState {
  chromeStyle: State<ChromeStyle>;
  chromeStyle$: Observable<ChromeStyle>;
  setChromeStyle: (style: ChromeStyle) => void;
}

export const createChromeStyleState = (): ChromeStyleState => {
  const chromeStyle = createState<ChromeStyle>('classic');

  const chromeStyle$ = chromeStyle.$.pipe(distinctUntilChanged(), shareReplay(1));

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
