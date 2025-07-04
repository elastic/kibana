/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SplitByTermsUI } from './terms';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  htmlIdGenerator: jest.fn(() => () => '42'),
  EuiFlexGroup: jest.requireActual('@elastic/eui').EuiFlexGroup,
  EuiFlexItem: jest.requireActual('@elastic/eui').EuiFlexItem,
  EuiFormRow: jest.requireActual('@elastic/eui').EuiFormRow,
  EuiFieldNumber: jest.requireActual('@elastic/eui').EuiFieldNumber,
  EuiComboBox: jest.requireActual('@elastic/eui').EuiComboBox,
  EuiFieldText: jest.requireActual('@elastic/eui').EuiFieldText,
}));

describe('src/legacy/core_plugins/metrics/public/components/splits/terms.test.js', () => {
  let props;

  beforeEach(() => {
    props = {
      intl: {
        formatMessage: jest.fn(),
      },
      model: {
        id: 123,
        terms_field: 'OriginCityName',
      },
      seriesQuantity: {
        id123: 123,
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
