/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import io from 'socket.io-client';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { uiModules } from 'ui/modules';

import { loadStatusSuccess } from './actions/status';
import { App } from './components/app';
import { store } from './stores';

const basePath = chrome.getBasePath();
export const socket = io(undefined, { path: `${basePath}/ws` });

socket.on('clone-progress', (data: any) => {
  const { repoUri, progress, cloneProgress } = data;
  store.dispatch(
    loadStatusSuccess({
      repoUri,
      status: {
        uri: repoUri,
        progress,
        cloneProgress,
      },
    })
  );
});

const app = uiModules.get('apps/codesearch');

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

chrome.setRootController('codesearch', RootController);
