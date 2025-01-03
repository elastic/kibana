/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shallow } from 'enzyme';
import React from 'react';
import { TooltipHeader } from './tooltip_header';
import { EndzoneTooltipHeader } from './endzone_tooltip_header';

describe('TooltipHeader', () => {
  const formatter = (value: unknown) => `formatted-${value}`;

  const xDomain = { min: 10, max: 100 };

  it('should handle endzone bucket', () => {
    const value = 1;
    const expectedValue = formatter(value);
    const tooltipHeader = shallow(
      <TooltipHeader xDomain={xDomain} formatter={formatter} value={value} />
    );

    const endzoneTooltip = tooltipHeader.find(EndzoneTooltipHeader);
    expect(endzoneTooltip.exists()).toBeTruthy();
    expect(endzoneTooltip.prop('value')).toEqual(expectedValue);

    const minInterval = 99.5;
    const newValue = 11;
    const newExpectedValue = formatter(newValue);

    const tooltipHeaderWithMinInterval = shallow(
      <TooltipHeader xDomain={{ ...xDomain, minInterval }} formatter={formatter} value={newValue} />
    );

    const endzoneTooltipWithMinInterval = tooltipHeaderWithMinInterval.find(EndzoneTooltipHeader);
    expect(endzoneTooltipWithMinInterval.exists()).toBeTruthy();
    expect(endzoneTooltipWithMinInterval.prop('value')).toEqual(newExpectedValue);
  });

  it('should render plain value at the header', () => {
    const value = 15;
    const tooltipHeader = shallow(
      <TooltipHeader xDomain={xDomain} formatter={formatter} value={value} />
    );

    expect(tooltipHeader).toMatchSnapshot();
  });
});
