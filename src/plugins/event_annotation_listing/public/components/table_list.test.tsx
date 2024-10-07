/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EventAnnotationGroupTableList,
  SAVED_OBJECTS_LIMIT_SETTING,
  SAVED_OBJECTS_PER_PAGE_SETTING,
} from './table_list';
import { TableListViewTable } from '@kbn/content-management-table-list-view-table';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-components/types';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { shallow, ShallowWrapper } from 'enzyme';
import {
  EventAnnotationGroupConfig,
  EVENT_ANNOTATION_GROUP_TYPE,
} from '@kbn/event-annotation-common';
import { taggingApiMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';

import { act } from 'react-dom/test-utils';
import { GroupEditorFlyout } from './group_editor_flyout';
import { DataView } from '@kbn/data-views-plugin/common';
import { QueryInputServices } from '@kbn/visualization-ui-components';
import { toastsServiceMock } from '@kbn/core-notifications-browser-mocks/src/toasts_service.mock';
import { IToasts } from '@kbn/core-notifications-browser';
import { ISessionService } from '@kbn/data-plugin/public';

describe('annotation list view', () => {
  const adHocDVId = 'ad-hoc';

  const group: EventAnnotationGroupConfig = {
    annotations: [],
    description: '',
    tags: [],
    indexPatternId: adHocDVId,
    title: 'My group',
    ignoreGlobalFilters: false,
    dataViewSpec: {
      id: adHocDVId,
      title: 'Ad hoc data view',
    },
  };

  let wrapper: ShallowWrapper<typeof EventAnnotationGroupTableList>;
  let mockEventAnnotationService: EventAnnotationServiceType;
  let mockToasts: IToasts;
  const searchSessionStartMethod = jest.fn<string, []>(() => 'some-session-id');

  beforeEach(() => {
    mockEventAnnotationService = {
      findAnnotationGroupContent: jest.fn(),
      deleteAnnotationGroups: jest.fn(),
      loadAnnotationGroup: jest.fn().mockResolvedValue(group),
      updateAnnotationGroup: jest.fn(() => Promise.resolve()),
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

    mockToasts = toastsServiceMock.createStartContract();

    wrapper = shallow<typeof EventAnnotationGroupTableList>(
      <EventAnnotationGroupTableList
        eventAnnotationService={mockEventAnnotationService}
        savedObjectsTagging={taggingApiMock.create()}
        uiSettings={mockUiSettings}
        visualizeCapabilities={{
          delete: true,
          save: true,
        }}
        parentProps={{
          onFetchSuccess: () => {},
          setPageDataTestSubject: () => {},
        }}
        dataViews={[
          {
            id: 'some-id',
            title: 'Some data view',
          } as DataView,
        ]}
        createDataView={() => Promise.resolve({} as DataView)}
        queryInputServices={{} as QueryInputServices}
        toasts={mockToasts}
        navigateToLens={() => {}}
        LensEmbeddableComponent={() => <div />}
        sessionService={
          { start: searchSessionStartMethod } as Partial<ISessionService> as ISessionService
        }
      />
    );
  });

  it('searches for groups', () => {
    const searchQuery = 'My Search Query';
    const references = [{ id: 'first_id', type: 'sometype' }];
    const referencesToExclude = [{ id: 'second_id', type: 'sometype' }];
    wrapper.find(TableListViewTable).prop('findItems')(searchQuery, {
      references,
      referencesToExclude,
    });

    expect(mockEventAnnotationService.findAnnotationGroupContent).toHaveBeenCalledWith(
      'My Search Query',
      30,
      ['first_id'],
      ['second_id']
    );
  });

  describe('deleting groups', () => {
    it('prevent deleting when user is missing perms', () => {
      wrapper.setProps({ visualizeCapabilities: { delete: false } });

      expect(wrapper.find(TableListViewTable).prop('deleteItems')).toBeUndefined();
    });

    it('deletes groups using the service', () => {
      expect(wrapper.find(TableListViewTable).prop('deleteItems')).toBeDefined();

      wrapper.find(TableListViewTable).prop('deleteItems')!([
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

  describe('editing groups', () => {
    it('prevents editing when user is missing perms', () => {
      wrapper.setProps({ visualizeCapabilities: { save: false } });

      expect(wrapper.find(TableListViewTable).prop('deleteItems')).toBeUndefined();
    });

    it('edits existing group', async () => {
      expect(wrapper.find(GroupEditorFlyout).exists()).toBeFalsy();
      const initialBouncerValue = wrapper.find(TableListViewTable).prop('refreshListBouncer');

      act(() => {
        wrapper.find(TableListViewTable).prop('editItem')!({
          id: '1234',
        } as UserContentCommonSchema);
      });

      // wait one tick to give promise time to settle
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEventAnnotationService.loadAnnotationGroup).toHaveBeenCalledWith('1234');

      expect(wrapper.find(GroupEditorFlyout).exists()).toBeTruthy();
      expect(wrapper.find(GroupEditorFlyout).prop('searchSessionId')).toBe('some-session-id');

      const updatedGroup = { ...group, tags: ['my-new-tag'] };

      wrapper.find(GroupEditorFlyout).prop('updateGroup')(updatedGroup);

      wrapper.find(GroupEditorFlyout).prop('onSave')();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockEventAnnotationService.updateAnnotationGroup).toHaveBeenCalledWith(
        updatedGroup,
        '1234'
      );

      expect(wrapper.find(GroupEditorFlyout).exists()).toBeFalsy();
      expect(wrapper.find(TableListViewTable).prop('refreshListBouncer')).not.toBe(
        initialBouncerValue
      ); // (should refresh list)
    });

    it('refreshes the search session', async () => {
      act(() => {
        wrapper.find(TableListViewTable).prop('editItem')!({
          id: '1234',
        } as UserContentCommonSchema);
      });

      // wait one tick to give promise time to settle
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(wrapper.find(GroupEditorFlyout).prop('searchSessionId')).toBe('some-session-id');

      searchSessionStartMethod.mockReturnValue('new-session-id');
      wrapper.find(GroupEditorFlyout).prop('refreshSearchSession')();

      expect(wrapper.find(GroupEditorFlyout).prop('searchSessionId')).toBe('new-session-id');
    });

    it('opens editor when title is clicked', async () => {
      act(() => {
        wrapper.find(TableListViewTable).prop('getOnClickTitle')!({
          id: '1234',
        } as UserContentCommonSchema)!();
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(wrapper.find(GroupEditorFlyout).exists()).toBeTruthy();
    });
  });
});
