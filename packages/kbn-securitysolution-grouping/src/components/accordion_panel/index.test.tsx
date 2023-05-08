/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fireEvent, render } from '@testing-library/react';
import { GroupPanel } from '.';
import { createGroupFilter, getNullGroupFilter } from './helpers';
import React from 'react';

const onToggleGroup = jest.fn();
const renderChildComponent = jest.fn();
const ruleName = 'Rule name';
const selectedGroup = 'kibana.alert.rule.name';

const testProps = {
  isLoading: false,
  isNullGroup: false,
  groupBucket: {
    selectedGroup,
    key: [ruleName, ruleName],
    key_as_string: `${ruleName}|${ruleName}`,
    doc_count: 98,
    hostsCountAggregation: {
      value: 5,
    },
    ruleTags: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
    alertsCount: {
      value: 98,
    },
    rulesCountAggregation: {
      value: 1,
    },
    severitiesSubAggregation: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'low',
          doc_count: 98,
        },
      ],
    },
    countSeveritySubAggregation: {
      value: 1,
    },
    usersCountAggregation: {
      value: 98,
    },
  },
  renderChildComponent,
  selectedGroup,
  onGroupClose: () => {},
};

describe('grouping accordion panel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('creates the query for the selectedGroup attribute', () => {
    const { getByTestId } = render(<GroupPanel {...testProps} />);
    expect(getByTestId('grouping-accordion')).toBeInTheDocument();
    expect(renderChildComponent).toHaveBeenCalledWith(
      createGroupFilter(testProps.selectedGroup, ruleName)
    );
  });
  it('creates the query for the selectedGroup attribute when the group is null', () => {
    const { getByTestId } = render(<GroupPanel {...testProps} isNullGroup />);
    expect(getByTestId('grouping-accordion')).toBeInTheDocument();
    expect(renderChildComponent).toHaveBeenCalledWith(getNullGroupFilter(testProps.selectedGroup));
  });
  it('does not render accordion or create query without a valid groupFieldValue', () => {
    const { queryByTestId } = render(
      <GroupPanel
        {...testProps}
        groupBucket={{
          ...testProps.groupBucket,
          // @ts-expect-error
          key: null,
        }}
      />
    );
    expect(queryByTestId('grouping-accordion')).not.toBeInTheDocument();
    expect(renderChildComponent).not.toHaveBeenCalled();
  });
  it('Does not render accordion or create query when groupBucket.selectedGroup !== selectedGroup', () => {
    const { queryByTestId } = render(<GroupPanel {...testProps} selectedGroup="source.ip" />);
    expect(queryByTestId('grouping-accordion')).not.toBeInTheDocument();
    expect(testProps.renderChildComponent).not.toHaveBeenCalled();
  });
  it('When onToggleGroup not defined, does nothing on toggle', () => {
    const { container } = render(<GroupPanel {...testProps} />);
    fireEvent.click(container.querySelector('[data-test-subj="grouping-accordion"] button')!);
    expect(onToggleGroup).not.toHaveBeenCalled();
  });
  it('When onToggleGroup is defined, calls function with proper args on toggle', () => {
    const { container } = render(<GroupPanel {...testProps} onToggleGroup={onToggleGroup} />);
    fireEvent.click(container.querySelector('[data-test-subj="grouping-accordion"] button')!);
    expect(onToggleGroup).toHaveBeenCalledWith(true, testProps.groupBucket);
  });
});
