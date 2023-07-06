/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreTheme } from '@kbn/core-theme-browser';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../context/context';

export const useKibanaTheme = (): CoreTheme => {
  const defaultTheme: CoreTheme = { darkMode: false };

  const {
    services: { theme },
  } = useKibana();

  if (!theme) {
    throw new TypeError('theme service not available in kibana-react context.');
  }

  return useObservable(theme.theme$, defaultTheme);
};
