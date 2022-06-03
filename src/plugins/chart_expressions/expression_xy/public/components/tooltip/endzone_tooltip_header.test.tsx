/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { EndzoneTooltipHeader } from './endzone_tooltip_header';

describe('EndzoneTooltipHeader', () => {
  it('should render endzone tooltip with value, if it is specified', () => {
    const endzoneTooltip = shallow(<EndzoneTooltipHeader value={'some value'} />);
    expect(endzoneTooltip).toMatchSnapshot();
  });

  it('should render endzone tooltip without value, if it is not specified', () => {
    const endzoneTooltip = shallow(<EndzoneTooltipHeader />);
    expect(endzoneTooltip).toMatchSnapshot();
  });
});
