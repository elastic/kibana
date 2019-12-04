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

import React, { Component, ReactNode } from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { I18nProvider } from '@kbn/i18n/react';

import { App, LegacyApp, AppMountParameters } from '../types';
import { MockedMounter, MockedMounterTuple } from '../test_types';

type Renderer = (
  item: string
) => Promise<ReactWrapper<any, Readonly<{}>, Component<{}, {}, any>> | null>;

export const createRenderer = (
  node: ReactNode | null,
  callback: (item: string) => void
): Renderer => {
  const dom = node !== null ? mount(<I18nProvider>{node}</I18nProvider>) : node;

  return (item: string) => {
    callback(item);
    if (dom) {
      dom.update();
    }
    return new Promise(resolve => setImmediate(() => resolve(dom))); // flushes any pending promises
  };
};

export const createAppMounter = (
  appId: string,
  html: string,
  appRoute = `/app/${appId}`
): MockedMounterTuple<App> => [
  appId,
  {
    appRoute,
    appBasePath: appRoute,
    mount: jest.fn(async ({ appBasePath: basename, element }: AppMountParameters) => {
      Object.assign(element, {
        innerHTML: `<div>\nbasename: ${basename}\nhtml: ${html}\n</div>`,
      });
      return jest.fn(() => Object.assign(element, { innerHTML: '' }));
    }),
  },
];

export const createLegacyAppMounter = (
  appId: string,
  legacyMount: MockedMounter<LegacyApp>['mount']
): MockedMounterTuple<LegacyApp> => [
  appId,
  {
    appRoute: `/app/${appId.split(':')[0]}`,
    appBasePath: `/app/${appId.split(':')[0]}`,
    unmountBeforeMounting: true,
    mount: legacyMount,
  },
];
