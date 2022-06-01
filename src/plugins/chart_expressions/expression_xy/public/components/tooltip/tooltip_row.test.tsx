/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { TooltipRow } from './tooltip_row';

describe('TooltipRow', () => {
  it('should render label and value if both are specified', () => {
    const tooltipRow = shallow(<TooltipRow value={'0'} label={'tooltip'} />);
    expect(tooltipRow).toMatchSnapshot();
  });

  it('should return null if either label or value is not specified', () => {
    const tooltipRow1 = shallow(<TooltipRow label={'tooltip'} />);
    expect(tooltipRow1).toEqual({});

    const tooltipRow2 = shallow(<TooltipRow value={'some value'} />);
    expect(tooltipRow2).toEqual({});

    const tooltipRow3 = shallow(<TooltipRow />);
    expect(tooltipRow3).toEqual({});
  });
});
