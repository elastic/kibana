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

import { coreMock } from '../../../../../core/public/mocks';
const startMock = coreMock.createStart();

import { mount } from 'enzyme';
import { PainlessError } from './painless_error';
import { findTestSubject } from '@elastic/eui/lib/test';
import * as searchPhaseException from '../../../common/search/test_data/search_phase_execution_exception.json';


describe('PainlessError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should show reason and code', () => {
    const e = new PainlessError({
      statusCode: 400,
      message: 'search_phase_execution_exception',
      attributes: searchPhaseException.error,
    });
    const component = mount(e.getErrorMessage(startMock.application));

    const scriptElem = findTestSubject(component, 'painlessScript').getDOMNode()
    
    const failedShards = e.attributes?.failed_shards![0];
    const script = failedShards!.reason.script;
    expect(scriptElem.textContent).toBe(`Error executing Painless script: '${script}'`);

    const stackTraceElem = findTestSubject(component, 'painlessStackTrace').getDOMNode();
    const stackTrace = failedShards!.reason.script_stack!.join('\n');
    expect(stackTraceElem.textContent).toBe(stackTrace);

    expect(component.find('EuiButton').length).toBe(1);
  });

});
