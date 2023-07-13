/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { I18nStart } from '@kbn/core-i18n-browser';
import React, { FC } from 'react';

import { KibanaEuiProvider, type KibanaEuiProviderProps } from './eui_provider';

/** Props for the KibanaRootContextProvider */
export interface KibanaRootContextProviderProps extends KibanaEuiProviderProps {
  i18n: I18nStart;
}

/**
 * The `KibanaRootContextProvider` provides the necessary context for Kibana's React components, including
 * the theme and i18n context.  This context should only be used _once_, and at the _very top_ of the
 * application root.
 */
export const KibanaRootContextProvider: FC<KibanaRootContextProviderProps> = ({
  children,
  i18n,
  ...props
}) => (
  <KibanaEuiProvider {...props}>
    <i18n.Context>{children}</i18n.Context>
  </KibanaEuiProvider>
);
