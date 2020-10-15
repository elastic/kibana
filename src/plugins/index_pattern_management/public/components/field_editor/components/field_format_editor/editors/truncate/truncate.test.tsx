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

import React, { ChangeEvent } from 'react';
import { shallow } from 'enzyme';
import { EuiFieldNumber } from '@elastic/eui';
import { FieldFormat } from 'src/plugins/data/public';

import { TruncateFormatEditor } from './truncate';

const fieldType = 'string';
const format = {
  getConverterFor: jest.fn().mockImplementation(() => (input: string) => input.substring(0, 10)),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return { fieldLength: 10 };
  }),
};
const formatParams = {
  fieldLength: 5,
};
const onChange = jest.fn();
const onError = jest.fn();

describe('TruncateFormatEditor', () => {
  beforeEach(() => {
    onChange.mockClear();
    onError.mockClear();
  });

  it('should have a formatId', () => {
    expect(TruncateFormatEditor.formatId).toEqual('truncate');
  });

  it('should render normally', async () => {
    const component = shallow(
      <TruncateFormatEditor
        fieldType={fieldType}
        format={(format as unknown) as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should fire error, when input is invalid', async () => {
    const component = shallow(
      <TruncateFormatEditor
        fieldType={fieldType}
        format={(format as unknown) as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    const input = component.find(EuiFieldNumber);

    const changeEvent = {
      target: {
        value: '123.3',
        checkValidity: () => false,
        validationMessage: 'Error!',
      },
    };

    await input!.invoke('onChange')!((changeEvent as unknown) as ChangeEvent<HTMLInputElement>);

    expect(onError).toBeCalledWith(changeEvent.target.validationMessage);
    expect(onChange).not.toBeCalled();
  });

  it('should fire change, when input changed and is valid', async () => {
    const component = shallow(
      <TruncateFormatEditor
        fieldType={fieldType}
        format={(format as unknown) as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    const input = component.find(EuiFieldNumber);

    const changeEvent = {
      target: {
        value: '123',
        checkValidity: () => true,
        validationMessage: null,
      },
    };
    onError.mockClear();
    await input!.invoke('onChange')!((changeEvent as unknown) as ChangeEvent<HTMLInputElement>);
    expect(onError).not.toBeCalled();
    expect(onChange).toBeCalledWith({ fieldLength: 123 });
  });
});
