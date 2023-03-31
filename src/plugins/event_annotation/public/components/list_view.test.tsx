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
import { TableListView } from '@kbn/content-management-table-list';
import { EventAnnotationServiceType } from '../event_annotation_service/types';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { shallow, ShallowWrapper } from 'enzyme';
import { EVENT_ANNOTATION_GROUP_TYPE } from '../../common';

describe('annotation list view', () => {
  let wrapper: ShallowWrapper<typeof EventAnnotationGroupListView>;
  let mockEventAnnotationService: EventAnnotationServiceType;
  beforeEach(() => {
    mockEventAnnotationService = {
      findAnnotationGroupContent: jest.fn(),
      deleteAnnotationGroups: jest.fn(),
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

    wrapper = shallow<typeof EventAnnotationGroupListView>(
      <EventAnnotationGroupListView
        eventAnnotationService={mockEventAnnotationService}
        uiSettings={mockUiSettings}
        visualizeCapabilities={{
          delete: true,
        }}
      />
    );
  });

  it('renders a table list view', () => {
    expect(wrapper.debug()).toMatchInlineSnapshot(
      `"<Memo(TableListViewComp) id=\\"annotation\\" headingId=\\"eventAnnotationGroupsListingHeading\\" findItems={[Function (anonymous)]} deleteItems={[Function (anonymous)]} listingLimit={30} initialPageSize={10} initialFilter=\\"\\" entityName=\\"annotation group\\" entityNamePlural=\\"annotation groups\\" tableListTitle=\\"Annotation Library\\" onClickTitle={[Function: onClickTitle]} />"`
    );
  });

  it('searches for groups', () => {
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

  describe('deleting groups', () => {
    it('prevent deleting when user is missing perms', () => {
      wrapper.setProps({ visualizeCapabilities: { delete: false } });

      expect(wrapper.find(TableListView).prop('deleteItems')).toBeUndefined();
    });

    it('deletes groups using the service', () => {
      expect(wrapper.find(TableListView).prop('deleteItems')).toBeDefined();

      wrapper.find(TableListView).prop('deleteItems')!([
        {
          id: 'some-id-1',
          references: [
            {
              type: 'index-pattern',
              name: 'metrics-*',
              id: 'metrics-*',
            },
          ],
          type: EVENT_ANNOTATION_GROUP_TYPE,
          updatedAt: '',
          attributes: {
            title: 'group1',
          },
        },
        {
          id: 'some-id-2',
          references: [],
          type: EVENT_ANNOTATION_GROUP_TYPE,
          updatedAt: '',
          attributes: {
            title: 'group2',
          },
        },
      ]);

      expect((mockEventAnnotationService.deleteAnnotationGroups as jest.Mock).mock.calls)
        .toMatchInlineSnapshot(`
        Array [
          Array [
            Array [
              "some-id-1",
              "some-id-2",
            ],
          ],
        ]
      `);
    });
  });
});
