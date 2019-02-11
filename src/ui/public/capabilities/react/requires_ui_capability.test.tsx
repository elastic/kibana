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

jest.mock('ui/chrome', () => ({
  getInjected(key: string) {
    if (key === 'uiCapabilities') {
      return {
        app: {
          feature1: true,
          feature2: false,
        },
      };
    }
  },
}));

import { mount } from 'enzyme';
import React from 'react';
import { UICapabilitiesProvider } from '.';
import { RequiresUICapability } from './requires_ui_capability';

describe('<RequiresUICapability>', () => {
  it('renders the child if the UI Capability is satisfied', () => {
    const wrapper = mount(
      <UICapabilitiesProvider>
        <RequiresUICapability uiCapability="app.feature1">
          <div>this renders</div>
        </RequiresUICapability>
      </UICapabilitiesProvider>
    );

    expect(wrapper).toMatchInlineSnapshot(`
<UICapabilitiesProvider>
  <InjectUICapabilities(Component)
    uiCapability="app.feature1"
  >
    <Component
      uiCapabilities={
        Object {
          "app": Object {
            "feature1": true,
            "feature2": false,
          },
        }
      }
      uiCapability="app.feature1"
    >
      <div>
        this renders
      </div>
    </Component>
  </InjectUICapabilities(Component)>
</UICapabilitiesProvider>
`);
  });

  it('does not render the child if the UI Capability is not satisfied', () => {
    const wrapper = mount(
      <UICapabilitiesProvider>
        <RequiresUICapability uiCapability="app.feature2">
          <div>this does not render</div>
        </RequiresUICapability>
      </UICapabilitiesProvider>
    );

    expect(wrapper).toMatchInlineSnapshot(`
<UICapabilitiesProvider>
  <InjectUICapabilities(Component)
    uiCapability="app.feature2"
  >
    <Component
      uiCapabilities={
        Object {
          "app": Object {
            "feature1": true,
            "feature2": false,
          },
        }
      }
      uiCapability="app.feature2"
    />
  </InjectUICapabilities(Component)>
</UICapabilitiesProvider>
`);
  });

  it('does not render the child if the UI Capability is not defined', () => {
    const wrapper = mount(
      <UICapabilitiesProvider>
        <RequiresUICapability uiCapability="app.subApp.feature3">
          <div>this does not render</div>
        </RequiresUICapability>
      </UICapabilitiesProvider>
    );

    expect(wrapper).toMatchInlineSnapshot(`
<UICapabilitiesProvider>
  <InjectUICapabilities(Component)
    uiCapability="app.subApp.feature3"
  >
    <Component
      uiCapabilities={
        Object {
          "app": Object {
            "feature1": true,
            "feature2": false,
          },
        }
      }
      uiCapability="app.subApp.feature3"
    />
  </InjectUICapabilities(Component)>
</UICapabilitiesProvider>
`);
  });
});
