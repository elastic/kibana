/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreTheme } from '@kbn/core-theme-browser';
import useObservable from 'react-use/lib/useObservable';
import { of } from 'rxjs';
import { useKibana } from '../context/context';

const defaultTheme: CoreTheme = { darkMode: false };

export const useKibanaTheme = (): CoreTheme => {
  const {
    services: { theme },
  } = useKibana();

  let themeObservable;

  if (!theme) {
    themeObservable = of(defaultTheme);
  } else {
    themeObservable = theme.theme$;
  }

  return useObservable(themeObservable, defaultTheme);
};
