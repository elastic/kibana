/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';

jest.mock('../lib/get_default_query_language', () => ({
  getDefaultQueryLanguage: () => 'kuery',
}));

import { TimeseriesPanelConfig } from './timeseries';
import { PanelConfigProps } from './types';

describe('TimeseriesPanelConfig', () => {
  it('sets the number input to the given value', () => {
    const props = {
      fields: {},
      model: {
        max_lines_legend: 2,
      },
      onChange: jest.fn(),
    } as unknown as PanelConfigProps;
    const wrapper = shallow(<TimeseriesPanelConfig {...props} />);
    wrapper.instance().setState({ selectedTab: 'options' });
    expect(
      wrapper.find('[data-test-subj="timeSeriesEditorDataMaxLegendLines"]').prop('value')
    ).toEqual(2);
  });

  it('switches on the truncate legend switch if the prop is set to 1 ', () => {
    const props = {
      fields: {},
      model: {
        max_lines_legend: 2,
        truncate_legend: 1,
      },
      onChange: jest.fn(),
    } as unknown as PanelConfigProps;
    const wrapper = shallow(<TimeseriesPanelConfig {...props} />);
    wrapper.instance().setState({ selectedTab: 'options' });
    expect(
      wrapper.find('[data-test-subj="timeSeriesEditorDataTruncateLegendSwitch"]').prop('value')
    ).toEqual(1);
  });

  it('switches off the truncate legend switch if the prop is set to 0', () => {
    const props = {
      fields: {},
      model: {
        max_lines_legend: 2,
        truncate_legend: 0,
      },
      onChange: jest.fn(),
    } as unknown as PanelConfigProps;
    const wrapper = shallow(<TimeseriesPanelConfig {...props} />);
    wrapper.instance().setState({ selectedTab: 'options' });
    expect(
      wrapper.find('[data-test-subj="timeSeriesEditorDataTruncateLegendSwitch"]').prop('value')
    ).toEqual(0);
  });

  it('disables the max lines number input if the truncate legend switch is off', () => {
    const props = {
      fields: {},
      model: {
        max_lines_legend: 2,
        truncate_legend: 0,
      },
      onChange: jest.fn(),
    } as unknown as PanelConfigProps;
    const wrapper = shallow(<TimeseriesPanelConfig {...props} />);
    wrapper.instance().setState({ selectedTab: 'options' });
    expect(
      wrapper.find('[data-test-subj="timeSeriesEditorDataMaxLegendLines"]').prop('disabled')
    ).toEqual(true);
  });
});
