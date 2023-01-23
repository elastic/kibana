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
import { BehaviorSubject } from 'rxjs';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DiscoverField, DiscoverFieldProps } from './discover_field';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { DiscoverAppStateProvider } from '../../services/discover_app_state_container';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { FetchStatus } from '../../../types';
import { DataDocuments$ } from '../../services/discover_data_state_container';
import { getDataTableRecords } from '../../../../__fixtures__/real_hits';
import * as DetailsUtil from './deprecated_stats/get_details';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';

jest.spyOn(DetailsUtil, 'getDetails');

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

  const hits = getDataTableRecords(dataView);
  const documents$ = new BehaviorSubject({
    fetchStatus: FetchStatus.COMPLETE,
    result: hits,
  }) as DataDocuments$;

  const props: DiscoverFieldProps = {
    documents$,
    dataView: stubDataView,
    field: finalField,
    ...(onAddFilterExists && { onAddFilter: jest.fn() }),
    onAddField: jest.fn(),
    onEditField: jest.fn(),
    onRemoveField: jest.fn(),
    showFieldStats,
    selected,
    contextualFields: [],
  };
  const services = {
    ...createDiscoverServicesMock(),
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
  };
  const appStateContainer = getDiscoverStateMock({ isTimeBased: true }).appState;
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
  beforeEach(() => {
    (DetailsUtil.getDetails as jest.Mock).mockClear();
  });

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
  it('should trigger getDetails for showing the deprecated field stats', async function () {
    const { comp, props } = await getComponent({
      selected: true,
      showFieldStats: true,
      showLegacyFieldTopValues: true,
    });
    findTestSubject(comp, 'field-bytes-showDetails').simulate('click');
    expect(DetailsUtil.getDetails).toHaveBeenCalledTimes(1);
    expect(findTestSubject(comp, `discoverFieldDetails-${props.field.name}`).exists()).toBeTruthy();
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
    const { comp } = await getComponent({
      selected: true,
      field,
      showLegacyFieldTopValues: true,
    });
    findTestSubject(comp, 'field-_source-showDetails').simulate('click');
    expect(DetailsUtil.getDetails).not.toHaveBeenCalledWith();
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
    await getComponent({});
    expect(DetailsUtil.getDetails).toHaveBeenCalledTimes(0);
  });
  it('should execute getDetails when show details is requested', async function () {
    const { comp } = await getComponent({
      showFieldStats: true,
      showLegacyFieldTopValues: true,
    });
    findTestSubject(comp, 'field-bytes-showDetails').simulate('click');
    expect(DetailsUtil.getDetails).toHaveBeenCalledTimes(1);
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
