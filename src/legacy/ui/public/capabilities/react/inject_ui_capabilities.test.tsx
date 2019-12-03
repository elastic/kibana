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

jest.mock('ui/capabilities', () => ({
  capabilities: {
    get: () => ({
      uiCapability1: true,
      uiCapability2: {
        nestedProp: 'nestedValue',
      },
    }),
  },
}));

import { mount } from 'enzyme';
import React from 'react';
import { UICapabilities } from '..';
import { injectUICapabilities } from './inject_ui_capabilities';
import { UICapabilitiesProvider } from './ui_capabilities_provider';

describe('injectUICapabilities', () => {
  it('provides UICapabilities to FCs', () => {
    interface FCProps {
      uiCapabilities: UICapabilities;
    }

    const MyFC = injectUICapabilities(({ uiCapabilities }: FCProps) => {
      return <span>{uiCapabilities.uiCapability2.nestedProp}</span>;
    });

    const wrapper = mount(
      <UICapabilitiesProvider>
        <MyFC />
      </UICapabilitiesProvider>
    );

    expect(wrapper).toMatchInlineSnapshot(`
<UICapabilitiesProvider>
  <InjectUICapabilities(Component)>
    <Component
      uiCapabilities={
        Object {
          "uiCapability1": true,
          "uiCapability2": Object {
            "nestedProp": "nestedValue",
          },
        }
      }
    >
      <span>
        nestedValue
      </span>
    </Component>
  </InjectUICapabilities(Component)>
</UICapabilitiesProvider>
`);
  });

  it('provides UICapabilities to class components', () => {
    interface ClassProps {
      uiCapabilities: UICapabilities;
    }

    // eslint-disable-next-line react/prefer-stateless-function
    class MyClassComponent extends React.Component<ClassProps, {}> {
      public render() {
        return <span>{this.props.uiCapabilities.uiCapability2.nestedProp}</span>;
      }
    }

    const WrappedComponent = injectUICapabilities(MyClassComponent);

    const wrapper = mount(
      <UICapabilitiesProvider>
        <WrappedComponent />
      </UICapabilitiesProvider>
    );

    expect(wrapper).toMatchInlineSnapshot(`
<UICapabilitiesProvider>
  <InjectUICapabilities(MyClassComponent)>
    <MyClassComponent
      uiCapabilities={
        Object {
          "uiCapability1": true,
          "uiCapability2": Object {
            "nestedProp": "nestedValue",
          },
        }
      }
    >
      <span>
        nestedValue
      </span>
    </MyClassComponent>
  </InjectUICapabilities(MyClassComponent)>
</UICapabilitiesProvider>
`);
  });
});
