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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { InspectorPanel } from './inspector_panel';
import { Adapters, InspectorViewDescription } from '../types';

describe('InspectorPanel', () => {
  let adapters: Adapters;
  let views: InspectorViewDescription[];

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
    const component = mountWithIntl(<InspectorPanel adapters={adapters} views={views} />);
    expect(component).toMatchSnapshot();
  });

  it('should not allow updating adapters', () => {
    const component = mountWithIntl(<InspectorPanel adapters={adapters} views={views} />);
    adapters.notAllowed = {};
    expect(() => component.setProps({ adapters })).toThrow();
  });
});
