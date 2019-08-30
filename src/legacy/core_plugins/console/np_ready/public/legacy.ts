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

import 'brace';

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { npSetup, npStart } from 'ui/new_platform';
import uiRoutes from 'ui/routes';
import { DOC_LINK_VERSION } from 'ui/documentation_links';
import { I18nContext } from 'ui/i18n';
import { ResizeChecker } from 'ui/resize_checker';
import 'ui/autoload/styles';
import 'ui/capabilities/route_setup';
/* eslint-enable @kbn/eslint/no-restricted-paths */

import template from '../../public/quarantined/index.html';
import { CoreSetup } from '../../../../../core/public';

interface SetupRegisterAppArgs {
  id: string;
  mount: (ctx: any, targetElement: HTMLDivElement) => Promise<any>;
}

export interface XCoreSetup extends CoreSetup {
  application: {
    register(args: SetupRegisterAppArgs): void;
  };
}

export interface XPluginSet {
  __LEGACY: {
    I18nContext: any;
    ResizeChecker: any;
    docLinkVersion: string;
  };
}

import { plugin } from '.';

const pluginInstance = plugin({} as any);

uiRoutes.when('/dev_tools/console', {
  requireUICapability: 'dev_tools.show',
  controller: function RootController($scope) {
    // Stub out this config for now...
    $scope.topNavMenu = [];

    $scope.initReactApp = () => {
      const targetElement = document.querySelector<HTMLDivElement>('#consoleRoot');
      if (!targetElement) {
        const message = `Could not mount Console App!`;
        npSetup.core.fatalErrors.add(message);
        throw new Error(message);
      }

      const xNpSetupCore: XCoreSetup = {
        ...npSetup.core,
        application: {
          register(args: SetupRegisterAppArgs): void {
            args.mount({}, targetElement).catch(err => {
              npSetup.core.fatalErrors.add(err);
            });
          },
        },
      };

      pluginInstance.setup(xNpSetupCore, {
        ...npSetup.plugins,
        __LEGACY: {
          I18nContext,
          ResizeChecker,
          docLinkVersion: DOC_LINK_VERSION,
        },
      });
      pluginInstance.start(npStart.core);
    };
  },
  template,
});
