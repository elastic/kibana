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
import { App } from './app';
import { createKbnUrlStateStorage } from '../../../../src/plugins/kibana_utils/public/';
import { ExampleLink } from '../common/example_page';

export const renderApp = (
  { notifications, application }: CoreStart,
  { navigation, data }: AppPluginDependencies,
  { element, history }: AppMountParameters,
  { exampleLinks }: { exampleLinks: ExampleLink[] }
) => {
  const kbnUrlStateStorage = createKbnUrlStateStorage({ useHash: false, history });

  ReactDOM.render(
    <App
      navigation={navigation}
      data={data}
      history={history}
      kbnUrlStateStorage={kbnUrlStateStorage}
      exampleLinks={exampleLinks}
      navigateToApp={application.navigateToApp}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
