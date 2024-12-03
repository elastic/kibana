/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../context';

export const useDarkMode = (defaultValue?: boolean): boolean => {
  const {
    services: { theme },
  } = useKibana();

  if (!theme) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new TypeError('theme service not available in kibana-react context.');
  }

  const currentTheme = useObservable(theme.theme$, theme.getTheme());
  return currentTheme.darkMode;
};
