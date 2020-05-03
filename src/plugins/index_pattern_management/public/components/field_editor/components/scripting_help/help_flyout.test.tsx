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
import { HttpStart } from 'src/core/public';
// eslint-disable-next-line
import { docLinksServiceMock } from '../../../../../../core/public/doc_links/doc_links_service.mock';

import { ScriptingHelpFlyout } from './help_flyout';

import { IndexPattern } from '../../../../../../plugins/data/public';

import { ExecuteScript } from '../../types';

jest.mock('./test_script', () => ({
  TestScript: () => {
    return `<div>mockTestScript</div>`;
  },
}));

const indexPatternMock = {} as IndexPattern;

describe('ScriptingHelpFlyout', () => {
  const docLinksScriptedFields = docLinksServiceMock.createStartContract().links.scriptedFields;
  it('should render normally', async () => {
    const component = shallow(
      <ScriptingHelpFlyout
        isVisible={true}
        indexPattern={indexPatternMock}
        lang="painless"
        executeScript={((() => {}) as unknown) as ExecuteScript}
        onClose={() => {}}
        getHttpStart={() => (({} as unknown) as HttpStart)}
        // docLinksScriptedFields={docLinksScriptedFields}
        docLinksScriptedFields={{} as typeof docLinksScriptedFields}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render nothing if not visible', async () => {
    const component = shallow(
      <ScriptingHelpFlyout
        isVisible={true}
        indexPattern={indexPatternMock}
        lang="painless"
        executeScript={((() => {}) as unknown) as ExecuteScript}
        onClose={() => {}}
        getHttpStart={() => (({} as unknown) as HttpStart)}
        docLinksScriptedFields={{} as typeof docLinksScriptedFields}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
