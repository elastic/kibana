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

import React, { ReactElement } from 'react';
import { act } from 'react-dom/test-utils';
import { mount } from 'enzyme';

import { I18nProvider } from '@kbn/i18n/react';

import { App, LegacyApp, AppMountParameters } from '../types';
import { EitherApp, MockedMounter, MockedMounterTuple, Mountable } from '../test_types';

type Dom = ReturnType<typeof mount> | null;
type Renderer = () => Dom | Promise<Dom>;

export const createRenderer = (element: ReactElement | null): Renderer => {
  const dom: Dom = element && mount(<I18nProvider>{element}</I18nProvider>);

  return () =>
    new Promise(async (resolve) => {
      if (dom) {
        await act(async () => {
          dom.update();
        });
      }
      setImmediate(() => resolve(dom)); // flushes any pending promises
    });
};

export const createAppMounter = ({
  appId,
  html = `<div>App ${appId}</div>`,
  appRoute = `/app/${appId}`,
  exactRoute = false,
  extraMountHook,
}: {
  appId: string;
  html?: string;
  appRoute?: string;
  exactRoute?: boolean;
  extraMountHook?: (params: AppMountParameters) => void;
}): MockedMounterTuple<App> => {
  const unmount = jest.fn();
  return [
    appId,
    {
      mounter: {
        appRoute,
        appBasePath: appRoute,
        legacy: false,
        exactRoute,
        mount: jest.fn(async (params: AppMountParameters) => {
          const { appBasePath: basename, element } = params;
          Object.assign(element, {
            innerHTML: `<div>\nbasename: ${basename}\nhtml: ${html}\n</div>`,
          });
          unmount.mockImplementation(() => Object.assign(element, { innerHTML: '' }));
          if (extraMountHook) {
            extraMountHook(params);
          }
          return unmount;
        }),
      },
      unmount,
    },
  ];
};

export const createLegacyAppMounter = (
  appId: string,
  legacyMount: MockedMounter<LegacyApp>['mount']
): MockedMounterTuple<LegacyApp> => [
  appId,
  {
    mounter: {
      appRoute: `/app/${appId.split(':')[0]}`,
      appBasePath: `/app/${appId.split(':')[0]}`,
      unmountBeforeMounting: true,
      legacy: true,
      exactRoute: false,
      mount: legacyMount,
    },
    unmount: jest.fn(),
  },
];

export function getUnmounter(app: Mountable<EitherApp>) {
  return app.mounter.mount.mock.results[0].value;
}
