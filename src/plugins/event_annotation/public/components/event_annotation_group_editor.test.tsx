/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent, FormEvent } from 'react';
import { EventAnnotationGroupConfig } from '../../common';
import { shallow, ShallowWrapper } from 'enzyme';
import { EventAnnotationGroupEditor } from './event_annotation_group_editor';
import { taggingApiMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';
import { EuiSelectProps, EuiTextAreaProps, EuiTextProps } from '@elastic/eui';

describe('event annotation group editor', () => {
  const mockTaggingApi = taggingApiMock.create();

  const dataViewId = 'my-index-pattern';
  const adHocDataViewId = 'ad-hoc';
  const adHocDataViewSpec = {
    id: adHocDataViewId,
    title: 'Ad Hoc Data View',
  };

  const group: EventAnnotationGroupConfig = {
    annotations: [],
    description: '',
    tags: [],
    indexPatternId: dataViewId,
    title: 'My group',
    ignoreGlobalFilters: false,
  };

  it('reports group updates', () => {
    const updateMock = jest.fn();
    const wrapper = shallow(
      <EventAnnotationGroupEditor
        group={group}
        update={updateMock}
        savedObjectsTagging={mockTaggingApi}
        dataViewListItems={[
          {
            id: dataViewId,
            title: 'My Data View',
          },
          {
            id: adHocDataViewId,
            title: 'Ad Hoc Data View',
          },
        ]}
        adHocDataViewSpec={adHocDataViewSpec}
      />
    );

    (wrapper.find("[data-test-subj='annotationGroupTitle']") as ShallowWrapper<EuiTextProps>).prop(
      'onChange'
    )!({
      target: {
        value: 'im a new title!',
      } as Partial<EventTarget> as EventTarget,
    } as FormEvent<HTMLDivElement>);

    (
      wrapper.find(
        "[data-test-subj='annotationGroupDescription']"
      ) as ShallowWrapper<EuiTextAreaProps>
    ).prop('onChange')!({
      target: {
        value: 'im a new description!',
      },
    } as ChangeEvent<HTMLTextAreaElement>);

    wrapper
      .find(mockTaggingApi.ui.components.SavedObjectSaveModalTagSelector)
      .prop('onTagsSelected')(['im a new tag!']);

    const setDataViewId = (id: string) =>
      (
        wrapper.find(
          "[data-test-subj='annotationDataViewSelection']"
        ) as ShallowWrapper<EuiSelectProps>
      ).prop('onChange')!({ target: { value: id } } as React.ChangeEvent<HTMLSelectElement>);

    setDataViewId(adHocDataViewId);
    setDataViewId(dataViewId);

    expect(updateMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "annotations": Array [],
            "description": "",
            "ignoreGlobalFilters": false,
            "indexPatternId": "my-index-pattern",
            "tags": Array [],
            "title": "im a new title!",
          },
        ],
        Array [
          Object {
            "annotations": Array [],
            "description": "im a new description!",
            "ignoreGlobalFilters": false,
            "indexPatternId": "my-index-pattern",
            "tags": Array [],
            "title": "My group",
          },
        ],
        Array [
          Object {
            "annotations": Array [],
            "description": "",
            "ignoreGlobalFilters": false,
            "indexPatternId": "my-index-pattern",
            "tags": Array [
              "im a new tag!",
            ],
            "title": "My group",
          },
        ],
        Array [
          Object {
            "annotations": Array [],
            "dataViewSpec": Object {
              "id": "ad-hoc",
              "title": "Ad Hoc Data View",
            },
            "description": "",
            "ignoreGlobalFilters": false,
            "indexPatternId": "ad-hoc",
            "tags": Array [],
            "title": "My group",
          },
        ],
        Array [
          Object {
            "annotations": Array [],
            "dataViewSpec": undefined,
            "description": "",
            "ignoreGlobalFilters": false,
            "indexPatternId": "my-index-pattern",
            "tags": Array [],
            "title": "My group",
          },
        ],
      ]
    `);
  });
});
