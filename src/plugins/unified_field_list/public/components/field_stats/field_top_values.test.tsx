/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiProgress, EuiButtonIcon } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { DataView } from '@kbn/data-views-plugin/common';
import { FieldTopValues, FieldTopValuesProps } from './field_top_values';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/data-plugin/common';

describe('UnifiedFieldList <FieldTopValues />', () => {
  let defaultProps: FieldTopValuesProps;
  let dataView: DataView;

  beforeEach(() => {
    dataView = {
      id: '1',
      title: 'my-fake-index-pattern',
      timeFieldName: 'timestamp',
      fields: [
        {
          name: 'source',
          displayName: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
          filterable: true,
        },
      ],
      getFormatterForField: jest.fn(() => ({
        convert: jest.fn((s: unknown) =>
          fieldFormatsServiceMock
            .createStartContract()
            .getDefaultInstance(KBN_FIELD_TYPES.STRING, [ES_FIELD_TYPES.STRING])
            .convert(s)
        ),
      })),
    } as unknown as DataView;

    defaultProps = {
      dataView,
      field: dataView.fields.find((f) => f.name === 'source')!,
      sampledValuesCount: 5000,
      buckets: [
        {
          count: 500,
          key: 'sourceA',
        },
        {
          count: 1,
          key: 'sourceB',
        },
      ],
      'data-test-subj': 'testing',
    };
  });

  it('should render correctly without filter actions', async () => {
    const wrapper = mountWithIntl(<FieldTopValues {...defaultProps} />);

    expect(wrapper.text()).toBe('sourceA10.0%sourceB0.0%Other90.0%');
    expect(wrapper.find(EuiProgress)).toHaveLength(3);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(0);
  });

  it('should render correctly with filter actions', async () => {
    const mockAddFilter = jest.fn();
    const wrapper = mountWithIntl(<FieldTopValues {...defaultProps} onAddFilter={mockAddFilter} />);

    expect(wrapper.text()).toBe('sourceA10.0%sourceB0.0%Other90.0%');
    expect(wrapper.find(EuiProgress)).toHaveLength(3);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(4);

    wrapper.find(EuiButtonIcon).first().simulate('click');

    expect(mockAddFilter).toHaveBeenCalledWith(defaultProps.field, 'sourceA', '+');
  });

  it('should render correctly without Other section', async () => {
    const wrapper = mountWithIntl(
      <FieldTopValues
        {...defaultProps}
        buckets={[
          {
            count: 3000,
            key: 'sourceA',
          },
          {
            count: 1500,
            key: 'sourceB',
          },
          {
            count: 500,
            key: 'sourceC',
          },
        ]}
      />
    );

    expect(wrapper.text()).toBe('sourceA60.0%sourceB30.0%sourceC10.0%');
  });

  it('should render correctly with empty strings', async () => {
    const wrapper = mountWithIntl(
      <FieldTopValues
        {...defaultProps}
        buckets={[
          {
            count: 3000,
            key: '',
          },
          {
            count: 1500,
            key: 'sourceA',
          },
          {
            count: 20,
            key: 'sourceB',
          },
        ]}
      />
    );

    expect(wrapper.text()).toBe('(empty)60.0%sourceA30.0%sourceB0.4%Other9.6%');
  });

  it('should render correctly without floating point', async () => {
    const wrapper = mountWithIntl(
      <FieldTopValues
        {...defaultProps}
        buckets={[
          {
            count: 5000,
            key: 'sourceA',
          },
        ]}
      />
    );

    expect(wrapper.text()).toBe('sourceA100%');
  });
});
