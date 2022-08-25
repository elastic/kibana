/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { DiscoverField, DiscoverFieldProps } from './discover_field';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';

const dataServiceMock = dataPluginMock.createStartContract();

jest.mock('../../../../kibana_services', () => ({
  getUiActions: jest.fn(() => {
    return {
      getTriggerCompatibleActions: jest.fn(() => []),
    };
  }),
}));

function getComponent({
  selected = false,
  showFieldStats = false,
  field,
  onAddFilterExists = true,
}: {
  selected?: boolean;
  showFieldStats?: boolean;
  field?: DataViewField;
  onAddFilterExists?: boolean;
}) {
  const finalField =
    field ??
    new DataViewField({
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      count: 10,
      scripted: false,
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });

  const props: DiscoverFieldProps = {
    dataView: stubDataView,
    field: finalField,
    getDetails: jest.fn(() => ({ buckets: [], error: '', exists: 1, total: 2 })),
    ...(onAddFilterExists && { onAddFilter: jest.fn() }),
    onAddField: jest.fn(),
    onRemoveField: jest.fn(),
    showFieldStats,
    selected,
    state: {
      query: { query: '', language: 'lucene' },
      filters: [],
    },
    contextualFields: [],
  };
  const services = {
    history: () => ({
      location: {
        search: '',
      },
    }),
    capabilities: {
      visualize: {
        show: true,
      },
    },
    uiSettings: {
      get: (key: string) => {
        if (key === 'fields:popularLimit') {
          return 5;
        }
        if (key === 'discover:showLegacyFieldTopValues') {
          return true;
        }
      },
    },
    data: {
      ...dataServiceMock,
      query: {
        ...dataServiceMock.query,
        timefilter: {
          ...dataServiceMock.query.timefilter,
          timefilter: {
            ...dataServiceMock.query.timefilter.timefilter,
            getTime: () => ({
              from: 'now-7d',
              to: 'now',
            }),
          },
        },
      },
    },
    dataViews: dataViewPluginMocks.createStartContract(),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    charts: chartPluginMock.createSetupContract(),
  };
  const comp = mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverField {...props} />
    </KibanaContextProvider>
  );
  return { comp, props };
}

describe('discover sidebar field', function () {
  it('should allow selecting fields', function () {
    const { comp, props } = getComponent({});
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddField).toHaveBeenCalledWith('bytes');
  });
  it('should allow deselecting fields', function () {
    const { comp, props } = getComponent({ selected: true });
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onRemoveField).toHaveBeenCalledWith('bytes');
  });
  it('should trigger getDetails', function () {
    const { comp, props } = getComponent({ selected: true, showFieldStats: true });
    findTestSubject(comp, 'field-bytes-showDetails').simulate('click');
    expect(props.getDetails).toHaveBeenCalledWith(props.field);
  });
  it('should not allow clicking on _source', function () {
    const field = new DataViewField({
      name: '_source',
      type: '_source',
      esTypes: ['_source'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
    const { comp, props } = getComponent({
      selected: true,
      field,
    });
    findTestSubject(comp, 'field-_source-showDetails').simulate('click');
    expect(props.getDetails).not.toHaveBeenCalled();
  });
  it('displays warning for conflicting fields', function () {
    const field = new DataViewField({
      name: 'troubled_field',
      type: 'conflict',
      esTypes: ['integer', 'text'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    });
    const { comp } = getComponent({
      selected: true,
      field,
    });
    const dscField = findTestSubject(comp, 'field-troubled_field-showDetails');
    expect(dscField.find('.kbnFieldButton__infoIcon').length).toEqual(1);
  });
  it('should not execute getDetails when rendered, since it can be expensive', function () {
    const { props } = getComponent({});
    expect(props.getDetails).toHaveBeenCalledTimes(0);
  });
  it('should execute getDetails when show details is requested', function () {
    const { props, comp } = getComponent({ showFieldStats: true });
    findTestSubject(comp, 'field-bytes-showDetails').simulate('click');
    expect(props.getDetails).toHaveBeenCalledTimes(1);
  });
  it('should not return the popover if onAddFilter is not provided', function () {
    const field = new DataViewField({
      name: '_source',
      type: '_source',
      esTypes: ['_source'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
    const { comp } = getComponent({
      selected: true,
      field,
      onAddFilterExists: false,
    });
    const popover = findTestSubject(comp, 'discoverFieldListPanelPopover');
    expect(popover.length).toBe(0);
  });
});
