/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { first } from 'lodash';
import uiRoutes from 'ui/routes';
import chrome from 'ui/chrome';

import { Theme } from '../types';
import * as context from './context';

export const setupNgForReact = (App: () => JSX.Element) => {
  const ROOT_ELEMENT_ID = 'poc_console2';
  const themeName: Theme = chrome.getUiSettingsClient().get('theme:darkMode') ? 'dark' : 'light';

  context.setInitialState({ themeName });

  chrome.setRootController('console2', function RootController($scope: any, $element: any) {
    const commentElement: Comment = first($element);
    const targetElement = commentElement.parentElement as HTMLElement;

    const consoleRootDiv = document.createElement('div');
    consoleRootDiv.setAttribute('id', ROOT_ELEMENT_ID);
    targetElement.appendChild(consoleRootDiv);

    render(
      <context.AppContextProvider>
        <App />
      </context.AppContextProvider>,
      targetElement
    );

    $scope.$on('destroy', () => {
      unmountComponentAtNode(targetElement);
      document.removeChild(consoleRootDiv);
    });
  });

  uiRoutes.when('/poc/console2', {
    requireUICapability: 'dev_tools.show',
  });
};
