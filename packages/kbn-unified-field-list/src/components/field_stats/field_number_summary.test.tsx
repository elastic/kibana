/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { FieldNumberSummary } from './field_number_summary';

const dataView = createStubDataView({
  spec: {
    id: 'test',
    title: 'test',
    fields: {
      bytes_counter: {
        timeSeriesMetric: 'counter',
        name: 'bytes_counter',
        type: 'number',
        esTypes: ['long'],
        aggregatable: true,
        searchable: true,
        count: 10,
        readFromDocValues: true,
        scripted: false,
        isMapped: true,
      },
    },
  },
});

describe('UnifiedFieldList <FieldNumberSummary />', () => {
  it('should render min and max correctly', async () => {
    const wrapper = mountWithIntl(
      <FieldNumberSummary
        dataView={dataView}
        field={dataView.getFieldByName('bytes_counter')!}
        numberSummary={{
          minValue: 45,
          maxValue: 12345,
        }}
        data-test-subj="test-subj"
      />
    );

    expect(wrapper.text()).toBe('min45max12345');
  });

  it('should not fail if data is invalid', async () => {
    const wrapper = mountWithIntl(
      <FieldNumberSummary
        dataView={dataView}
        field={dataView.getFieldByName('bytes_counter')!}
        numberSummary={undefined}
        data-test-subj="test-subj"
      />
    );

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
