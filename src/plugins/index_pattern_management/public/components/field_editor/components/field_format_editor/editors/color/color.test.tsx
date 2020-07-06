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
import { shallowWithI18nProvider } from 'test_utils/enzyme_helpers';
import { FieldFormat } from 'src/plugins/data/public';

import { ColorFormatEditor } from './color';
import { fieldFormats } from '../../../../../../../../data/public';

const fieldType = 'string';
const format = {
  getConverterFor: jest.fn(),
};
const formatParams = {
  colors: [{ ...fieldFormats.DEFAULT_CONVERTER_COLOR }],
};
const onChange = jest.fn();
const onError = jest.fn();

describe('ColorFormatEditor', () => {
  it('should have a formatId', () => {
    expect(ColorFormatEditor.formatId).toEqual('color');
  });

  it('should render string type normally (regex field)', async () => {
    const component = shallowWithI18nProvider(
      <ColorFormatEditor
        fieldType={fieldType}
        format={(format as unknown) as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render other type normally (range field)', async () => {
    const component = shallowWithI18nProvider(
      <ColorFormatEditor
        fieldType={'number'}
        format={(format as unknown) as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render multiple colors', async () => {
    const component = shallowWithI18nProvider(
      <ColorFormatEditor
        fieldType={fieldType}
        format={(format as unknown) as FieldFormat}
        formatParams={{ colors: [...formatParams.colors, ...formatParams.colors] }}
        onChange={onChange}
        onError={onError}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
