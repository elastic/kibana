/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';
import { App } from './components/app';
import { bindSocket } from './socket';
import { store } from './stores';

// Bind the web socket client.
bindSocket(store);

const app = uiModules.get('apps/code');

app.config(($locationProvider: any) => {
  $locationProvider.html5Mode({
    enabled: false,
    requireBase: false,
    rewriteLinks: false,
  });
});
app.config((stateManagementConfigProvider: any) => stateManagementConfigProvider.disable());

function RootController($scope: any, $element: any, $http: any) {
  const domNode = $element[0];

  // render react to DOM
  render(
    <Provider store={store}>
      <App />
    </Provider>,
    domNode
  );

  // unmount react on controller destroy
  $scope.$on('$destroy', () => {
    unmountComponentAtNode(domNode);
  });
}

chrome.setRootController('code', RootController);
