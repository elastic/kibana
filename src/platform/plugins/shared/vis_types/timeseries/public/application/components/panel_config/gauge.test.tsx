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

jest.mock('../lib/get_default_query_language', () => ({
  getDefaultQueryLanguage: () => 'kuery',
}));

import { GaugePanelConfig } from './gauge';
import { PanelConfigProps } from './types';

describe('GaugePanelConfig', () => {
  it('call switch tab onChange={handleChange}', () => {
    const props = {
      fields: {},
      model: {},
      onChange: jest.fn(),
    } as unknown as PanelConfigProps;
    const wrapper = shallow(<GaugePanelConfig {...props} />);

    wrapper.find('EuiTab').first().simulate('onClick');
    expect(props.onChange).toBeCalled();
  });

  it('call onChange={handleChange}', () => {
    const props = {
      fields: {},
      model: {},
      onChange: jest.fn(),
    } as unknown as PanelConfigProps;
    const wrapper = shallow(<GaugePanelConfig {...props} />);

    wrapper.simulate('onClick');
    expect(props.onChange).toBeCalled();
  });
});
