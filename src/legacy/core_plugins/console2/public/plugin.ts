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
import { unmountComponentAtNode } from 'react-dom';

import { Plugin, PluginInitializerContext, CoreStart } from '../../../../core/public';

import { ThemeMode } from './types';
import { XCoreSetup } from './shim';
import * as context from './application/context';
import indexHtml from './index.html';
import { renderApp } from './index';

import { konsole, worker } from './application/konsole_lang';
import * as editor from './application/editor';

const CONSOLE_EL_ROOT_ID = 'console2Root';

export class ConsolePlugin implements Plugin {
  // @ts-ignore
  constructor(private readonly initCtx: PluginInitializerContext) {}

  setup(core: XCoreSetup) {
    const { chrome, routes } = core;

    const themeMode: ThemeMode = chrome.getUiSettingsClient().get('theme:darkMode')
      ? 'dark'
      : 'light';
    context.setInitialState({ themeMode });

    editor.setup();
    editor.registerLanguage(konsole, worker.src);

    routes.registerNgRoutes.when('/dev_tools/console2', {
      controller: ($scope: any) => {
        const targetElement = document.querySelector(`#${CONSOLE_EL_ROOT_ID}`) as HTMLElement;
        renderApp(targetElement);
        $scope.$on('destroy', () => {
          unmountComponentAtNode(targetElement);
        });
      },
      template: indexHtml,
    });
  }

  start(core: CoreStart) {}

  stop() {}
}
