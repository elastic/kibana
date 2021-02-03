/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { InspectorPanel } from './inspector_panel';
import { InspectorViewDescription } from '../types';
import { Adapters } from '../../common';
import type { IUiSettingsClient } from 'kibana/public';

describe('InspectorPanel', () => {
  let adapters: Adapters;
  let views: InspectorViewDescription[];
  const uiSettings: IUiSettingsClient = {} as IUiSettingsClient;

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
      <InspectorPanel adapters={adapters} views={views} dependencies={{ uiSettings }} />
    );
    expect(component).toMatchSnapshot();
  });

  it('should not allow updating adapters', () => {
    const component = mountWithIntl(
      <InspectorPanel adapters={adapters} views={views} dependencies={{ uiSettings }} />
    );
    adapters.notAllowed = {};
    expect(() => component.setProps({ adapters })).toThrow();
  });
});
