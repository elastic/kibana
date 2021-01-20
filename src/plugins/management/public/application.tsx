/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { AppMountParameters } from 'kibana/public';
import { ManagementApp, ManagementAppDependencies } from './components/management_app';

export const renderApp = async (
  { history, appBasePath, element }: AppMountParameters,
  dependencies: ManagementAppDependencies
) => {
  ReactDOM.render(
    <ManagementApp dependencies={dependencies} appBasePath={appBasePath} history={history} />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
