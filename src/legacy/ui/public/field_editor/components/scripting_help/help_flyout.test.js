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
import { shallow } from 'enzyme';

import { ScriptingHelpFlyout } from './help_flyout';

jest.mock('ui/documentation_links', () => ({
  getDocLink: doc => `(docLink for ${doc})`,
}));

const indexPatternMock = {};

describe('ScriptingHelpFlyout', () => {
  it('should render normally', async () => {
    const component = shallow(
      <ScriptingHelpFlyout
        isVisible={true}
        indexPattern={indexPatternMock}
        lang="painless"
        executeScript={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render nothing if not visible', async () => {
    const component = shallow(
      <ScriptingHelpFlyout
        indexPattern={indexPatternMock}
        lang="painless"
        executeScript={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
