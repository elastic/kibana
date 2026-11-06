/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { getServicesMock } from '../../../__mocks__/services.mock';
import { createStateService } from '../services/state_service';
import {
  UnifiedFieldListItemStats,
  getFieldForStats,
  type UnifiedFieldListItemStatsProps,
} from './field_list_item_stats';
import { FieldStats } from '../../components/field_stats';
import { useQuerySubscriber, hasQuerySubscriberData } from '../../hooks/use_query_subscriber';
import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { Filter, Query } from '@kbn/es-query';

jest.mock('../../hooks/use_query_subscriber', () => ({
  useQuerySubscriber: jest.fn(),
  hasQuerySubscriberData: jest.fn(),
}));

jest.mock('../../components/field_stats', () => ({
  FieldStats: jest.fn(() => <div data-testid="mock-field-stats" />),
}));

const mockUseQuerySubscriber = jest.mocked(useQuerySubscriber);
const mockHasQuerySubscriberData = jest.mocked(hasQuerySubscriberData);
const mockFieldStats = jest.mocked(FieldStats);

const defaultQuerySubscriberResult = {
  query: { query: '', language: 'lucene' },
  filters: [],
  fromDate: 'now-15m',
  toDate: 'now',
  searchMode: 'documents' as const,
};

const aggrField = new DataViewField({
  name: 'machine.os.raw',
  type: 'string',
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
  scripted: false,
});

const nonAggrField = new DataViewField({
  name: 'machine.os',
  type: 'string',
  searchable: true,
  aggregatable: false,
  readFromDocValues: false,
  scripted: false,
});

const renderComponent = (props: Partial<UnifiedFieldListItemStatsProps> = {}) => {
  const stateService = createStateService({ options: { originatingApp: 'test' } });

  const defaultProps: UnifiedFieldListItemStatsProps = {
    stateService,
    field: aggrField,
    services: getServicesMock(),
    dataView: stubDataView,
    onAddFilter: jest.fn(),
    ...props,
  };

  return renderWithKibanaRenderContext(<UnifiedFieldListItemStats {...defaultProps} />);
};

describe('getFieldForStats', () => {
  it('returns the field itself when it is aggregatable', () => {
    expect(getFieldForStats(aggrField, undefined)).toBe(aggrField);
  });

  it('returns the field itself when multiFields is undefined', () => {
    expect(getFieldForStats(nonAggrField, undefined)).toBe(nonAggrField);
  });

  it('returns the aggregatable multi-field when the parent field is not aggregatable', () => {
    const aggrMultiField = new DataViewField({
      name: 'machine.os.keyword',
      type: 'string',
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
      scripted: false,
    });

    const result = getFieldForStats(nonAggrField, [{ field: aggrMultiField, isSelected: false }]);

    expect(result).toBe(aggrMultiField);
  });

  it('falls back to the original field when no aggregatable multi-field exists', () => {
    const anotherNonAggrField = new DataViewField({
      name: 'machine.os.text',
      type: 'string',
      searchable: true,
      aggregatable: false,
      readFromDocValues: false,
      scripted: false,
    });

    const result = getFieldForStats(nonAggrField, [
      { field: anotherNonAggrField, isSelected: false },
    ]);

    expect(result).toBe(nonAggrField);
  });
});

describe('<UnifiedFieldListItemStats />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuerySubscriber.mockReturnValue(defaultQuerySubscriberResult);
    mockHasQuerySubscriberData.mockReturnValue(true);
  });

  it('returns null when hasQuerySubscriberData is false', () => {
    mockHasQuerySubscriberData.mockReturnValue(false);

    const { container } = renderComponent();

    expect(container).toBeEmptyDOMElement();
    expect(mockFieldStats).not.toHaveBeenCalled();
  });

  it('renders FieldStats when hasQuerySubscriberData is true', () => {
    renderComponent();

    expect(mockFieldStats).toHaveBeenCalled();
  });

  it('passes aggregatable field to FieldStats', () => {
    renderComponent({ field: aggrField });

    const fieldProp = mockFieldStats.mock.calls[0][0].field;
    expect(fieldProp).toBe(aggrField);
  });

  it('passes aggregatable multi-field to FieldStats when parent is not aggregatable', () => {
    const aggrMultiField = new DataViewField({
      name: 'machine.os.keyword',
      type: 'string',
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
      scripted: false,
    });

    renderComponent({
      field: nonAggrField,
      multiFields: [{ field: aggrMultiField, isSelected: false }],
    });

    const fieldProp = mockFieldStats.mock.calls[0][0].field;
    expect(fieldProp).toBe(aggrMultiField);
  });

  it('merges additionalFilters with query filters', () => {
    const queryFilter: Filter = {
      meta: { alias: null, disabled: false, negate: false },
      query: { match_phrase: { 'machine.os': 'osx' } },
    };
    const additionalFilter: Filter = {
      meta: { alias: null, disabled: false, negate: false },
      query: { match_phrase: { host: 'localhost' } },
    };

    mockUseQuerySubscriber.mockReturnValue({
      ...defaultQuerySubscriberResult,
      filters: [queryFilter],
    });

    renderComponent({ additionalFilters: [additionalFilter] });

    const filtersProp = mockFieldStats.mock.calls[0][0].filters;
    expect(filtersProp).toEqual([queryFilter, additionalFilter]);
  });

  it('forwards props to FieldStats', () => {
    const onAddFilter = jest.fn();
    const query: Query = { query: 'host: localhost', language: 'lucene' };
    mockUseQuerySubscriber.mockReturnValue({
      ...defaultQuerySubscriberResult,
      query,
      fromDate: '2024-01-01',
      toDate: '2024-01-31',
    });

    renderComponent({ dataView: stubDataView, onAddFilter });

    const props = mockFieldStats.mock.calls[0][0];
    expect(props.dataViewOrDataViewId).toBe(stubDataView);
    expect(props.onAddFilter).toBe(onAddFilter);
    expect(props.query).toBe(query);
    expect(props.fromDate).toBe('2024-01-01');
    expect(props.toDate).toBe('2024-01-31');
  });

  it('extracts uiSettings from core.uiSettings', () => {
    const services = getServicesMock();

    renderComponent({ services });

    const servicesProp = mockFieldStats.mock.calls[0][0].services;
    expect(servicesProp.uiSettings).toBe(services.core.uiSettings);
  });

  it('passes data-test-subj from stateService to FieldStats', () => {
    const stateService = createStateService({
      options: {
        originatingApp: 'test',
        dataTestSubj: { fieldListItemStatsDataTestSubj: 'fieldStats-test' },
      },
    });

    renderComponent({ stateService });

    const dataTestSubjProp = mockFieldStats.mock.calls[0][0]['data-test-subj'];
    expect(dataTestSubjProp).toBe('fieldStats-test');
  });
});
