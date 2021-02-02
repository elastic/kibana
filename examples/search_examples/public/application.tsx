/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../src/core/public';
import { AppPluginStartDependencies } from './types';
import { SearchExamplesApp } from './components/app';

export const renderApp = (
  { notifications, savedObjects, http }: CoreStart,
  { navigation, data }: AppPluginStartDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <SearchExamplesApp
      basename={appBasePath}
      notifications={notifications}
      savedObjectsClient={savedObjects.client}
      navigation={navigation}
      data={data}
      http={http}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
