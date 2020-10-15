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
import { mount } from 'enzyme';
import { KibanaContextProvider } from 'src/plugins/kibana_react/public';
import { mockManagementPlugin } from '../../../../mocks';
import { ScriptingWarningCallOut } from './warning_call_out';

describe('ScriptingWarningCallOut', () => {
  const mockedContext = mockManagementPlugin.createIndexPatternManagmentContext();

  it('should render normally', async () => {
    const component = mount(<ScriptingWarningCallOut isVisible={true} />, {
      wrappingComponent: KibanaContextProvider,
      wrappingComponentProps: {
        services: mockedContext,
      },
    });

    expect(component).toMatchSnapshot();
  });

  it('should render nothing if not visible', async () => {
    const component = mount(<ScriptingWarningCallOut isVisible={false} />, {
      wrappingComponent: KibanaContextProvider,
      wrappingComponentProps: {
        services: mockedContext,
      },
    });

    expect(component).toMatchSnapshot();
  });
});
