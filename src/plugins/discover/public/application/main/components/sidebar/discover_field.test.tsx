/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act } from 'react-dom/test-utils';
import { EuiPopover, EuiProgress, EuiButtonIcon } from '@elastic/eui';
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
import { DiscoverAppStateProvider } from '../../services/discover_app_state_container';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';

jest.mock('@kbn/unified-field-list-plugin/public/services/field_stats', () => ({
  loadFieldStats: jest.fn().mockResolvedValue({
    totalDocuments: 1624,
    sampledDocuments: 1624,
    sampledValues: 3248,
    topValues: {
      buckets: [
        {
          count: 2042,
          key: 'osx',
        },
        {
          count: 1206,
          key: 'winx',
        },
      ],
    },
  }),
}));

const dataServiceMock = dataPluginMock.createStartContract();

jest.mock('../../../../kibana_services', () => ({
  getUiActions: jest.fn(() => {
    return {
      getTriggerCompatibleActions: jest.fn(() => []),
    };
  }),
}));

async function getComponent({
  selected = false,
  showFieldStats = false,
  field,
  onAddFilterExists = true,
  showLegacyFieldTopValues = false,
}: {
  selected?: boolean;
  showFieldStats?: boolean;
  field?: DataViewField;
  onAddFilterExists?: boolean;
  showLegacyFieldTopValues?: boolean;
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
  const dataView = stubDataView;
  dataView.toSpec = () => ({});

  const props: DiscoverFieldProps = {
    dataView: stubDataView,
    field: finalField,
    getDetails: jest.fn(() => ({ buckets: [], error: '', exists: 1, total: 2 })),
    ...(onAddFilterExists && { onAddFilter: jest.fn() }),
    onAddField: jest.fn(),
    onEditField: jest.fn(),
    onRemoveField: jest.fn(),
    showFieldStats,
    selected,
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
          return showLegacyFieldTopValues;
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
            getAbsoluteTime: () => ({
              from: '2021-08-31T22:00:00.000Z',
              to: '2022-09-01T09:16:29.553Z',
            }),
          },
        },
      },
    },
    dataViews: dataViewPluginMocks.createStartContract(),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    charts: chartPluginMock.createSetupContract(),
  };
  const appStateContainer = getDiscoverStateMock({ isTimeBased: true }).appStateContainer;
  appStateContainer.set({
    query: { query: '', language: 'lucene' },
    filters: [],
  });
  const comp = await mountWithIntl(
    <KibanaContextProvider services={services}>
      <DiscoverAppStateProvider value={appStateContainer}>
        <DiscoverField {...props} />
      </DiscoverAppStateProvider>
    </KibanaContextProvider>
  );
  // wait for lazy modules
  await new Promise((resolve) => setTimeout(resolve, 0));
  await comp.update();
  return { comp, props };
}

describe('discover sidebar field', function () {
  it('should allow selecting fields', async function () {
    const { comp, props } = await getComponent({});
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddField).toHaveBeenCalledWith('bytes');
  });
  it('should allow deselecting fields', async function () {
    const { comp, props } = await getComponent({ selected: true });
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onRemoveField).toHaveBeenCalledWith('bytes');
  });
  it('should trigger getDetails', async function () {
    const { comp, props } = await getComponent({
      selected: true,
      showFieldStats: true,
      showLegacyFieldTopValues: true,
    });
    findTestSubject(comp, 'field-bytes-showDetails').simulate('click');
    expect(props.getDetails).toHaveBeenCalledWith(props.field);
  });
  it('should not allow clicking on _source', async function () {
    const field = new DataViewField({
      name: '_source',
      type: '_source',
      esTypes: ['_source'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
    const { comp, props } = await getComponent({
      selected: true,
      field,
      showLegacyFieldTopValues: true,
    });
    findTestSubject(comp, 'field-_source-showDetails').simulate('click');
    expect(props.getDetails).not.toHaveBeenCalled();
  });
  it('displays warning for conflicting fields', async function () {
    const field = new DataViewField({
      name: 'troubled_field',
      type: 'conflict',
      esTypes: ['integer', 'text'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: false,
    });
    const { comp } = await getComponent({
      selected: true,
      field,
    });
    const dscField = findTestSubject(comp, 'field-troubled_field-showDetails');
    expect(dscField.find('.kbnFieldButton__infoIcon').length).toEqual(1);
  });
  it('should not execute getDetails when rendered, since it can be expensive', async function () {
    const { props } = await getComponent({});
    expect(props.getDetails).toHaveBeenCalledTimes(0);
  });
  it('should execute getDetails when show details is requested', async function () {
    const { props, comp } = await getComponent({
      showFieldStats: true,
      showLegacyFieldTopValues: true,
    });
    findTestSubject(comp, 'field-bytes-showDetails').simulate('click');
    expect(props.getDetails).toHaveBeenCalledTimes(1);
  });
  it('should not return the popover if onAddFilter is not provided', async function () {
    const field = new DataViewField({
      name: '_source',
      type: '_source',
      esTypes: ['_source'],
      searchable: true,
      aggregatable: true,
      readFromDocValues: true,
    });
    const { comp } = await getComponent({
      selected: true,
      field,
      onAddFilterExists: false,
    });
    const popover = findTestSubject(comp, 'discoverFieldListPanelPopover');
    expect(popover.length).toBe(0);
  });
  it('should request field stats', async function () {
    const field = new DataViewField({
      name: 'machine.os.raw',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
    });

    const { comp } = await getComponent({ showFieldStats: true, field, onAddFilterExists: true });

    await act(async () => {
      const fieldItem = findTestSubject(comp, 'field-machine.os.raw-showDetails');
      await fieldItem.simulate('click');
      await comp.update();
    });

    await comp.update();

    expect(comp.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(findTestSubject(comp, 'dscFieldStats-title').text()).toBe('Top values');
    expect(findTestSubject(comp, 'dscFieldStats-topValues-bucket')).toHaveLength(2);
    expect(
      findTestSubject(comp, 'dscFieldStats-topValues-formattedFieldValue').first().text()
    ).toBe('osx');
    expect(comp.find(EuiProgress)).toHaveLength(2);
    expect(findTestSubject(comp, 'dscFieldStats-topValues').find(EuiButtonIcon)).toHaveLength(4);
  });
  it('should include popover actions', async function () {
    const field = new DataViewField({
      name: 'extension.keyword',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
    });

    const { comp, props } = await getComponent({ field, onAddFilterExists: true });

    await act(async () => {
      const fieldItem = findTestSubject(comp, 'field-extension.keyword-showDetails');
      await fieldItem.simulate('click');
      await comp.update();
    });

    await comp.update();

    expect(comp.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(
      comp.find('[data-test-subj="fieldPopoverHeader_addField-extension.keyword"]').exists()
    ).toBeTruthy();
    expect(
      comp
        .find('[data-test-subj="discoverFieldListPanelAddExistFilter-extension.keyword"]')
        .exists()
    ).toBeTruthy();
    expect(
      comp.find('[data-test-subj="discoverFieldListPanelEdit-extension.keyword"]').exists()
    ).toBeTruthy();
    expect(
      comp.find('[data-test-subj="discoverFieldListPanelDelete-extension.keyword"]').exists()
    ).toBeFalsy();

    await act(async () => {
      const fieldItem = findTestSubject(comp, 'fieldPopoverHeader_addField-extension.keyword');
      await fieldItem.simulate('click');
      await comp.update();
    });

    expect(props.onAddField).toHaveBeenCalledWith('extension.keyword');

    await comp.update();

    expect(comp.find(EuiPopover).prop('isOpen')).toBe(false);
  });

  it('should not include + action for selected fields', async function () {
    const field = new DataViewField({
      name: 'extension.keyword',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
    });

    const { comp } = await getComponent({
      field,
      onAddFilterExists: true,
      selected: true,
    });

    await act(async () => {
      const fieldItem = findTestSubject(comp, 'field-extension.keyword-showDetails');
      await fieldItem.simulate('click');
      await comp.update();
    });

    await comp.update();

    expect(comp.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(
      comp.find('[data-test-subj="fieldPopoverHeader_addField-extension.keyword"]').exists()
    ).toBeFalsy();
  });
});
