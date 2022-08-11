/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { NoDataConfigPage } from './no_data_config_page';

describe('NoDataConfigPage', () => {
  const noDataConfig = {
    solution: 'Kibana',
    logo: 'logoKibana',
    docsLink: 'test-link',
    action: {
      kibana: {
        button: 'Click me',
        onClick: jest.fn(),
        description: 'Page with no data',
      },
    },
  };
  test('renders', () => {
    const component = shallow(<NoDataConfigPage noDataConfig={noDataConfig} />);
    expect(component).toMatchSnapshot();
  });
});
