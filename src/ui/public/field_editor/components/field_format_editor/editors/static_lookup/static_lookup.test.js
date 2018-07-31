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
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { StaticLookupFormatEditorComponent } from './static_lookup';

const fieldType = 'string';
const format = {
  getConverterFor: jest.fn(),
};
const formatParams = {
  lookupEntries: [{}],
  unknownKeyValue: null,
};
const onChange = jest.fn();
const onError = jest.fn();


describe('StaticLookupFormatEditor', () => {
  it('should render normally', async () => {
    const component = shallowWithIntl(
      <StaticLookupFormatEditorComponent
        fieldType={fieldType}
        format={format}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render multiple lookup entries and unknown key value', async () => {
    const component = shallowWithIntl(
      <StaticLookupFormatEditorComponent
        fieldType={fieldType}
        format={format}
        formatParams={{ lookupEntries: [{}, {}, {}], unknownKeyValue: 'test value' }}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
