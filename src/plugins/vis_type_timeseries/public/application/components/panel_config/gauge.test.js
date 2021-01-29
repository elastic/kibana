/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl } from '@kbn/test/jest';

jest.mock('../lib/get_default_query_language', () => ({
  getDefaultQueryLanguage: () => 'kuery',
}));

import { GaugePanelConfig } from './gauge';

describe('GaugePanelConfig', () => {
  it('call switch tab onChange={handleChange}', () => {
    const props = {
      fields: {},
      model: {},
      onChange: jest.fn(),
    };
    const wrapper = shallowWithIntl(<GaugePanelConfig.WrappedComponent {...props} />);

    wrapper.find('EuiTab').first().simulate('onClick');
    expect(props.onChange).toBeCalled();
  });

  it('call onChange={handleChange}', () => {
    const props = {
      fields: {},
      model: {},
      onChange: jest.fn(),
    };
    const wrapper = shallowWithIntl(<GaugePanelConfig.WrappedComponent {...props} />);

    wrapper.simulate('onClick');
    expect(props.onChange).toBeCalled();
  });
});
