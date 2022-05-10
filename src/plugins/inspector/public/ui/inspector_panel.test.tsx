/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { InspectorPanel } from './inspector_panel';
import { InspectorViewDescription } from '../types';
import { Adapters } from '../../common';
import type { ApplicationStart, HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import { SharePluginStart } from '@kbn/share-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { applicationServiceMock } from '@kbn/core/public/mocks';

describe('InspectorPanel', () => {
  let adapters: Adapters;
  let views: InspectorViewDescription[];
  const dependencies = {
    application: applicationServiceMock.createStartContract(),
    http: {},
    share: sharePluginMock.createStartContract(),
    uiSettings: {},
  } as unknown as {
    application: ApplicationStart;
    http: HttpSetup;
    share: SharePluginStart;
    uiSettings: IUiSettingsClient;
  };

  beforeEach(() => {
    adapters = {
      foodapter: {
        foo() {
          return 42;
        },
      },
      bardapter: {},
    };
    views = [
      {
        title: 'View 1',
        order: 200,
        component: () => <h1>View 1</h1>,
      },
      {
        title: 'Foo View',
        order: 100,
        component: () => <h1>Foo view</h1>,
        shouldShow(adapters2: Adapters) {
          return adapters2.foodapter;
        },
      },
      {
        title: 'Never',
        order: 200,
        component: () => null,
        shouldShow() {
          return false;
        },
      },
    ];
  });

  it('should render as expected', () => {
    const component = mountWithIntl(
      <InspectorPanel adapters={adapters} views={views} dependencies={dependencies} />
    );
    expect(component).toMatchSnapshot();
  });

  it('should not allow updating adapters', () => {
    const component = mountWithIntl(
      <InspectorPanel adapters={adapters} views={views} dependencies={dependencies} />
    );
    adapters.notAllowed = {};
    expect(() => component.setProps({ adapters })).toThrow();
  });
});
