/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { AppPluginDependencies } from './types';
import { StateDemoApp } from './components/app';
import { createKbnUrlStateStorage } from '../../../../src/plugins/kibana_utils/public/';

export const renderApp = (
  { notifications, http }: CoreStart,
  { navigation, data }: AppPluginDependencies,
  { element, history }: AppMountParameters
) => {
  const kbnUrlStateStorage = createKbnUrlStateStorage({ useHash: false, history });

  ReactDOM.render(
    <StateDemoApp
      notifications={notifications}
      http={http}
      navigation={navigation}
      data={data}
      history={history}
      kbnUrlStateStorage={kbnUrlStateStorage}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
