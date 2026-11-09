/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { LegendSizeSettings } from './legend_size_settings';
import { LegendSize, DEFAULT_LEGEND_SIZE } from '@kbn/chart-expressions-common';
import { EuiSuperSelect } from '@elastic/eui';
import { shallow } from 'enzyme';

describe('legend size settings', () => {
  it('select is disabled if not vertical legend', () => {
    const instance = shallow(
      <LegendSizeSettings
        legendSize={undefined}
        onLegendSizeChange={() => {}}
        isVerticalLegend={false}
      />
    );

    expect(instance.find(EuiSuperSelect).props().disabled).toBeTruthy();
  });

  it('reflects current setting in select', () => {
    const CURRENT_SIZE = LegendSize.SMALL;

    const instance = shallow(
      <LegendSizeSettings
        legendSize={CURRENT_SIZE}
        onLegendSizeChange={() => {}}
        isVerticalLegend={true}
      />
    );

    expect(instance.find(EuiSuperSelect).props().valueOfSelected).toBe(CURRENT_SIZE);
  });

  it('allows user to select a new option', () => {
    const onSizeChange = jest.fn();

    const instance = shallow(
      <LegendSizeSettings
        legendSize={LegendSize.SMALL}
        onLegendSizeChange={onSizeChange}
        isVerticalLegend={true}
      />
    );

    const onChange = instance.find(EuiSuperSelect).props().onChange;

    onChange?.(LegendSize.EXTRA_LARGE);
    onChange?.(LegendSize.AUTO);
    onChange?.(DEFAULT_LEGEND_SIZE);

    expect(onSizeChange).toHaveBeenNthCalledWith(1, LegendSize.EXTRA_LARGE);
    expect(onSizeChange).toHaveBeenNthCalledWith(2, LegendSize.AUTO);
    expect(onSizeChange).toHaveBeenNthCalledWith(3, undefined);
  });
});
