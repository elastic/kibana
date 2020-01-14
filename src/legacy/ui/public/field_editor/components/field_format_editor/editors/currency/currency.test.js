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

import { CurrencyFormatEditor } from './currency';

const fieldType = 'number';
const format = {
  getConverterFor: jest.fn().mockImplementation(() => input => input * 2),
  getParamDefaults: jest.fn().mockImplementation(() => {
    // return { pattern: '0,0.[000]b' };
    return { currencyCode: 'EUR' };
  }),
};
const formatParams = {};
const onChange = jest.fn();
const onError = jest.fn();

describe('CurrencyFormatEditor', () => {
  it('should have a formatId', () => {
    expect(CurrencyFormatEditor.formatId).toEqual('currency');
  });

  it('should render normally', async () => {
    const component = shallow(
      <CurrencyFormatEditor
        fieldType={fieldType}
        format={format}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should error if an incomplete other currency is added', async () => {
    const component = shallow(
      <CurrencyFormatEditor
        fieldType={fieldType}
        format={format}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    const options = component.find('[data-test-subj="fieldEditor-currency-currencies"]');
    options.prop('onChange')([{ value: null }]);

    const otherInput = component.find('[data-test-subj="fieldEditor-currency-otherInput"]');
    otherInput.prop('onChange')({ target: { value: 'AB' } });
    expect(onError).toHaveBeenCalled();

    onError.mockClear();

    otherInput.prop('onChange')({ target: { value: 'ABC' } });
    expect(onError).not.toHaveBeenCalled();
  });
});
