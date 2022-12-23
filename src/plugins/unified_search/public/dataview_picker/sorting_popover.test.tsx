/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shallow } from 'enzyme';
import React from 'react';
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
  it('should render `EuiPopover`', () => {
    const wrapper = shallow(
      <SortingPopover sortingService={sortingService} handleSortingChange={jest.fn()} />
    );
    expect(wrapper).toMatchInlineSnapshot(`
    <EuiPopover
      anchorPosition="downCenter"
      aria-labelledby="optionsList_sortingOptions"
      button={
        <EuiButtonIcon
          aria-label="Define the sort order"
          iconType="sortable"
          onClick={[Function]}
        />
      }
      closePopover={[Function]}
      display="inline-block"
      hasArrow={true}
      isOpen={false}
      ownFocus={true}
      panelPaddingSize="none"
    >
      <EuiPopoverTitle
        paddingSize="s"
      >
        Sort by
      </EuiPopoverTitle>
      <EuiSelectable
        aria-label="Define the sort order"
        isPreFiltered={false}
        listProps={
          Object {
            "bordered": false,
          }
        }
        onChange={[Function]}
        options={
          Array [
            Object {
              "checked": "on",
              "data": Object {
                "key": "alphabetically",
              },
              "label": "Alphabetically",
            },
          ]
        }
        searchable={false}
        singleSelection="always"
        style={
          Object {
            "width": 208,
          }
        }
      >
        <Component />
      </EuiSelectable>
      <EuiHorizontalRule
        margin="none"
      />
      <EuiPopoverTitle
        paddingSize="s"
      >
        Order
      </EuiPopoverTitle>
      <EuiSelectable
        aria-label="Define the sort order"
        isPreFiltered={false}
        listProps={
          Object {
            "bordered": false,
          }
        }
        onChange={[Function]}
        options={
          Array [
            Object {
              "checked": "on",
              "data": Object {
                "key": "asc",
              },
              "label": "Ascending",
            },
            Object {
              "checked": undefined,
              "data": Object {
                "key": "desc",
              },
              "label": "Descending",
            },
          ]
        }
        searchable={false}
        singleSelection="always"
        style={
          Object {
            "width": 208,
          }
        }
      >
        <Component />
      </EuiSelectable>
    </EuiPopover>
    `);
  });
});
