/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { AirdropKibanaProvider } from '@kbn/airdrops';
import { AirdropPluginStart, AppPluginStartDependencies } from './types';
import { AirdropApp } from './components/app';

export const renderApp = (
  { notifications, http }: CoreStart,
  { airdrop }: AppPluginStartDependencies & { airdrop: AirdropPluginStart },
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <AirdropKibanaProvider airdrop={airdrop}>
      <AirdropApp basename={appBasePath} notifications={notifications} http={http} />
    </AirdropKibanaProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
