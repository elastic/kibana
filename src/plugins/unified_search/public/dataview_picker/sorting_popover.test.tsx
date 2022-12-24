/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { StubBrowserStorage } from '@kbn/test-jest-helpers';
import type { DataViewListItemEnhanced } from './dataview_list';
import { SortingService } from './sorting_service';

import { SortingPopover } from './sorting_popover';

describe('SortingPopover', () => {
  let storage: IStorageWrapper;
  let sortingService: SortingService<DataViewListItemEnhanced>;

  beforeEach(() => {
    storage = new Storage(new StubBrowserStorage());
    sortingService = new SortingService<DataViewListItemEnhanced>(
      {
        alphabetically: (item) => item.name ?? item.title,
      },
      storage
    );
  });

  it('should render EuiPopover', () => {
    const wrapper = mount(
      <SortingPopover sortingService={sortingService} handleSortingChange={jest.fn()} />
    );
    expect(wrapper).toMatchSnapshot();

    wrapper.find(`[data-test-subj="openPopoverButton"]`).last().simulate('click');

    const euiSelectable = wrapper.find('EuiSelectable');

    expect(euiSelectable.first().prop('options')).toEqual([
      expect.objectContaining({
        checked: 'on',
        data: { key: 'alphabetically' },
        label: 'Alphabetically',
      }),
    ]);

    expect(euiSelectable.last().prop('options')).toEqual([
      expect.objectContaining({ data: { key: 'asc' }, checked: 'on', label: 'Ascending' }),
      expect.objectContaining({ data: { key: 'desc' }, checked: undefined, label: 'Descending' }),
    ]);
  });
});
