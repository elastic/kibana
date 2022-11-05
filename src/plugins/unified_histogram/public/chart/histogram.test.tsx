/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { UnifiedHistogramFetchStatus } from '../types';
import { Histogram } from './histogram';
import React from 'react';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';

function mountComponent(status: UnifiedHistogramFetchStatus, error?: Error) {
  const services = unifiedHistogramServicesMock;
  services.data.query.timefilter.timefilter.getAbsoluteTime = () => {
    return { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' };
  };

  const timefilterUpdateHandler = jest.fn();

  const props = {
    services: unifiedHistogramServicesMock,
    chart: {
      hidden: false,
      timeInterval: 'auto',
    },
    timefilterUpdateHandler,
    dataView: dataViewWithTimefieldMock,
    filters: [],
    query: {
      language: 'kuery',
      query: '',
    },
    timeRange: {
      from: '2020-05-14T11:05:13.590',
      to: '2020-05-14T11:20:13.590',
    },
  };

  return mountWithIntl(<Histogram {...props} />);
}

describe('Histogram', () => {
  it('renders correctly', () => {
    const component = mountComponent('complete');
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBe(true);
  });
});
