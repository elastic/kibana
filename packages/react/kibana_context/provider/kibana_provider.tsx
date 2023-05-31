/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { ComponentPropsWithoutRef } from 'react';

import { KibanaThemeProvider } from '../theme';
import { composeProviders } from '../utils';
import { ComposeProvidersFn } from '../utils/compose';

export const KibanaContextProvider = composeProviders([I18nProvider, KibanaThemeProvider]);
export type KibanaContextProviderProps = ComponentPropsWithoutRef<typeof KibanaContextProvider>;

export const withKibanaContextProvider: ComposeProvidersFn = (providers) =>
  composeProviders([KibanaContextProvider, ...providers]);
