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
import { shallowWithI18nProvider } from '../../../../../../../../../test_utils/public/enzyme_helpers';
import { StaticLookupFormatEditorFormatParams } from './static_lookup';
import { FieldFormat } from '../../../../../../../../data/public';

import { StaticLookupFormatEditor } from './static_lookup';

const fieldType = 'string';
const format = {
  getConverterFor: jest.fn(),
};
const formatParams = {
  lookupEntries: [{}] as StaticLookupFormatEditorFormatParams['lookupEntries'],
  unknownKeyValue: '',
};
const onChange = jest.fn();
const onError = jest.fn();

describe('StaticLookupFormatEditor', () => {
  it('should have a formatId', () => {
    expect(StaticLookupFormatEditor.formatId).toEqual('static_lookup');
  });

  it('should render normally', async () => {
    const component = shallowWithI18nProvider(
      <StaticLookupFormatEditor
        fieldType={fieldType}
        format={(format as unknown) as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render multiple lookup entries and unknown key value', async () => {
    const component = shallowWithI18nProvider(
      <StaticLookupFormatEditor
        fieldType={fieldType}
        format={(format as unknown) as FieldFormat}
        formatParams={{
          lookupEntries: [{}, {}, {}] as StaticLookupFormatEditorFormatParams['lookupEntries'],
          unknownKeyValue: 'test value',
        }}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
