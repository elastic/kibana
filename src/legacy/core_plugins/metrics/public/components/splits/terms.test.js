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
import { SplitByTermsUI } from './terms';

jest.mock('@elastic/eui', () => ({
  htmlIdGenerator: jest.fn(() => () => '42'),
  EuiFlexGroup: require.requireActual('@elastic/eui').EuiFlexGroup,
  EuiFlexItem: require.requireActual('@elastic/eui').EuiFlexItem,
  EuiFormRow: require.requireActual('@elastic/eui').EuiFormRow,
  EuiFieldNumber: require.requireActual('@elastic/eui').EuiFieldNumber,
  EuiComboBox: require.requireActual('@elastic/eui').EuiComboBox,
  EuiFieldText: require.requireActual('@elastic/eui').EuiFieldText,
}));

describe('src/legacy/core_plugins/metrics/public/components/splits/terms.test.js', () => {
  let props;

  beforeEach(() => {
    props = {
      intl: {
        formatMessage: jest.fn(),
      },
      model: {
        terms_field: 'OriginCityName',
      },
      onChange: jest.fn(),
      indexPattern: 'kibana_sample_data_flights',
      fields: {
        kibana_sample_data_flights: [
          {
            aggregatable: true,
            name: 'OriginCityName',
            readFromDocValues: true,
            searchable: true,
            type: 'string',
            esTypes: ['keyword'],
          },
        ],
      },
    };
  });

  describe('<SplitByTermsUI />', () => {
    test('should render and match a snapshot', () => {
      const wrapper = shallow(<SplitByTermsUI {...props} />);

      expect(wrapper).toMatchSnapshot();
    });
  });
});
