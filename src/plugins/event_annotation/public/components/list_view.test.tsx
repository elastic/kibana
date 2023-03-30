/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EventAnnotationGroupListView,
  SAVED_OBJECTS_LIMIT_SETTING,
  SAVED_OBJECTS_PER_PAGE_SETTING,
} from './list_view';
import { shallowWithIntl } from '@kbn/test-jest-helpers';
import { TableListView } from '@kbn/content-management-table-list';
import { EventAnnotationServiceType } from '../event_annotation_service/types';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { ShallowWrapper } from 'enzyme';

describe('annotation list view', () => {
  let wrapper: ShallowWrapper;
  let mockEventAnnotationService: EventAnnotationServiceType;
  beforeEach(() => {
    mockEventAnnotationService = {
      findAnnotationGroupContent: jest.fn(),
    } as Partial<EventAnnotationServiceType> as EventAnnotationServiceType;

    const mockUiSettings = {
      get: jest.fn(
        (key) =>
          ({
            [SAVED_OBJECTS_LIMIT_SETTING]: 30,
            [SAVED_OBJECTS_PER_PAGE_SETTING]: 10,
          }[key])
      ),
    } as Partial<IUiSettingsClient> as IUiSettingsClient;

    wrapper = shallowWithIntl(
      <EventAnnotationGroupListView
        eventAnnotationService={mockEventAnnotationService}
        uiSettings={mockUiSettings}
      />
    );
  });

  it('renders a table list view', () => {
    expect(wrapper.debug()).toMatchInlineSnapshot(
      `"<Memo(TableListViewComp) id=\\"annotation\\" headingId=\\"eventAnnotationGroupsListingHeading\\" findItems={[Function (anonymous)]} listingLimit={30} initialPageSize={10} initialFilter=\\"\\" entityName=\\"visualization\\" entityNamePlural=\\"visualizations\\" tableListTitle=\\"Annotation Library\\" onClickTitle={[Function: onClickTitle]} />"`
    );
  });

  it('searches for items', () => {
    const searchQuery = 'My Search Query';
    const references = [{ id: 'first_id', type: 'sometype' }];
    const referencesToExclude = [{ id: 'second_id', type: 'sometype' }];
    wrapper.find(TableListView).prop('findItems')(searchQuery, {
      references,
      referencesToExclude,
    });

    expect(mockEventAnnotationService.findAnnotationGroupContent).toHaveBeenCalledWith(
      'My Search Query',
      30,
      [{ id: 'first_id', type: 'sometype' }],
      [{ id: 'second_id', type: 'sometype' }]
    );
  });
});
