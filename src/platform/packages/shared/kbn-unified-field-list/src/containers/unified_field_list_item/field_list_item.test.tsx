/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act } from 'react-dom/test-utils';
import { EuiButtonIcon, EuiPopover, EuiProgress } from '@elastic/eui';
import React from 'react';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { getServicesMock } from '../../../__mocks__/services.mock';
import { UnifiedFieldListItem, UnifiedFieldListItemProps } from './field_list_item';
import { FieldItemButton } from '../../components/field_item_button';
import { createStateService } from '../services/state_service';

jest.mock('../../services/field_stats', () => ({
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

async function getComponent({
  selected = false,
  field,
  canFilter = true,
  isBreakdownSupported = true,
}: {
  selected?: boolean;
  field?: DataViewField;
  canFilter?: boolean;
  isBreakdownSupported?: boolean;
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

  const stateService = createStateService({
    options: {
      originatingApp: 'test',
    },
  });

  const props: UnifiedFieldListItemProps = {
    services: getServicesMock(),
    stateService,
    searchMode: 'documents',
    dataView: stubDataView,
    field: finalField,
    ...(canFilter && { onAddFilter: jest.fn() }),
    ...(isBreakdownSupported && { onAddBreakdownField: jest.fn() }),
    onAddFieldToWorkspace: jest.fn(),
    onRemoveFieldFromWorkspace: jest.fn(),
    onEditField: jest.fn(),
    isSelected: selected,
    isEmpty: false,
    groupIndex: 1,
    itemIndex: 0,
    size: 'xs',
    workspaceSelectedFieldNames: [],
  };
  const comp = await mountWithIntl(<UnifiedFieldListItem {...props} />);
  // wait for lazy modules
  await new Promise((resolve) => setTimeout(resolve, 0));
  await comp.update();
  return { comp, props };
}

describe('UnifiedFieldListItem', function () {
  it('should allow selecting fields', async function () {
    const { comp, props } = await getComponent({});
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onAddFieldToWorkspace).toHaveBeenCalledWith(props.field);
  });
  it('should allow deselecting fields', async function () {
    const { comp, props } = await getComponent({ selected: true });
    findTestSubject(comp, 'fieldToggle-bytes').simulate('click');
    expect(props.onRemoveFieldFromWorkspace).toHaveBeenCalledWith(props.field);
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
  it('should not enable the popover if onAddFilter is not provided', async function () {
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
      canFilter: false,
    });

    expect(comp.find(FieldItemButton).prop('onClick')).toBeUndefined();
  });

  it('should not show addBreakdownField action button if not supported', async function () {
    const field = new DataViewField({
      name: 'extension.keyword',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
    });
    const { comp } = await getComponent({
      field,
      isBreakdownSupported: false,
    });

    await act(async () => {
      const fieldItem = findTestSubject(comp, 'field-extension.keyword-showDetails');
      await fieldItem.simulate('click');
      await comp.update();
    });

    await comp.update();

    expect(
      comp
        .find('[data-test-subj="fieldPopoverHeader_addBreakdownField-extension.keyword"]')
        .exists()
    ).toBeFalsy();
  });
  it('should request field stats', async function () {
    const field = new DataViewField({
      name: 'machine.os.raw',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
    });

    const { comp } = await getComponent({ field, canFilter: true });

    await act(async () => {
      const fieldItem = findTestSubject(comp, 'field-machine.os.raw-showDetails');
      await fieldItem.simulate('click');
      await comp.update();
    });

    await comp.update();

    expect(comp.find(EuiPopover).prop('isOpen')).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 0));
    await comp.update();

    expect(findTestSubject(comp, 'fieldStats-title').text()).toBe('Top values');
    expect(findTestSubject(comp, 'fieldStats-topValues-bucket')).toHaveLength(2);
    expect(findTestSubject(comp, 'fieldStats-topValues-formattedFieldValue').first().text()).toBe(
      'osx'
    );
    expect(comp.find(EuiProgress)).toHaveLength(2);
    expect(findTestSubject(comp, 'fieldStats-topValues').find(EuiButtonIcon)).toHaveLength(4);
  });
  it('should include popover actions', async function () {
    const field = new DataViewField({
      name: 'extension.keyword',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      searchable: true,
    });

    const { comp, props } = await getComponent({ field, canFilter: true });

    await act(async () => {
      const fieldItem = findTestSubject(comp, 'field-extension.keyword-showDetails');
      await fieldItem.simulate('click');
      await comp.update();
    });

    await comp.update();

    expect(comp.find(EuiPopover).prop('isOpen')).toBe(true);
    expect(
      comp
        .find('[data-test-subj="fieldPopoverHeader_addBreakdownField-extension.keyword"]')
        .exists()
    ).toBeTruthy();
    expect(
      comp.find('[data-test-subj="fieldPopoverHeader_addField-extension.keyword"]').exists()
    ).toBeTruthy();
    expect(
      comp.find('[data-test-subj="fieldPopoverHeader_addExistsFilter-extension.keyword"]').exists()
    ).toBeTruthy();
    expect(
      comp.find('[data-test-subj="fieldPopoverHeader_editField-extension.keyword"]').exists()
    ).toBeTruthy();
    expect(
      comp.find('[data-test-subj="fieldPopoverHeader_deleteField-extension.keyword"]').exists()
    ).toBeFalsy();

    await act(async () => {
      const fieldItem = findTestSubject(comp, 'fieldPopoverHeader_addField-extension.keyword');
      await fieldItem.simulate('click');
      await comp.update();
    });

    expect(props.onAddFieldToWorkspace).toHaveBeenCalledWith(field);

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
      canFilter: true,
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
