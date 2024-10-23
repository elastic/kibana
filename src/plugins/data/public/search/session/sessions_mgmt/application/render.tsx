/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { AppDependencies } from '..';
import { SearchSessionsMgmtMain } from '../components/main';

export const renderApp = (
  elem: HTMLElement | null,
  { i18n, uiSettings, ...homeDeps }: AppDependencies
) => {
  if (!elem) {
    return () => undefined;
  }

  // uiSettings is required by the listing table to format dates in the timezone from Settings
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings,
  });

  render(
    <KibanaRenderContextProvider theme={homeDeps.core.theme} i18n={i18n}>
      <KibanaReactContextProvider>
        <SearchSessionsMgmtMain {...homeDeps} timezone={uiSettings.get('dateFormat:tz')} />
      </KibanaReactContextProvider>
    </KibanaRenderContextProvider>,
    elem
  );

  return () => {
    unmountComponentAtNode(elem);
  };
};
