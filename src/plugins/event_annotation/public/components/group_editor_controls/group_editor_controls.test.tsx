/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ChangeEvent, FormEvent } from 'react';
import { EventAnnotationGroupConfig } from '../../../common';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { GroupEditorControls } from './group_editor_controls';
import { EuiSelectProps, EuiTextAreaProps, EuiTextProps } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { act } from 'react-dom/test-utils';
import type { QueryInputServices } from '@kbn/visualization-ui-components/public';
import { AnnotationEditorControls } from '..';

describe('event annotation group editor', () => {
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
    dataViewSpec: adHocDataViewSpec,
  };

  let wrapper: ReactWrapper;
  let updateMock: jest.Mock;

  const TagSelector = (_props: { onTagsSelected: (tags: string[]) => void }) => <div />;

  beforeEach(async () => {
    updateMock = jest.fn();

    wrapper = mountWithIntl(
      <GroupEditorControls
        group={group}
        update={updateMock}
        TagSelector={TagSelector}
        dataViews={
          [
            {
              id: dataViewId,
              title: 'My Data View',
            },
          ] as DataView[]
        }
        selectedAnnotation={undefined}
        setSelectedAnnotation={jest.fn()}
        createDataView={(spec) =>
          Promise.resolve({
            id: spec.id,
            title: spec.title,
            toSpec: () => spec,
          } as unknown as DataView)
        }
        queryInputServices={{} as QueryInputServices}
      />
    );

    await act(async () => {
      await new Promise((resolve) => setImmediate(resolve));
      wrapper.update();
    });
  });

  it('reports group updates', () => {
    (
      wrapper.find(
        "EuiFieldText[data-test-subj='annotationGroupTitle']"
      ) as ReactWrapper<EuiTextProps>
    ).prop('onChange')!({
      target: {
        value: 'im a new title!',
      } as Partial<EventTarget> as EventTarget,
    } as FormEvent<HTMLDivElement>);

    (
      wrapper.find(
        "EuiTextArea[data-test-subj='annotationGroupDescription']"
      ) as ReactWrapper<EuiTextAreaProps>
    ).prop('onChange')!({
      target: {
        value: 'im a new description!',
      },
    } as ChangeEvent<HTMLTextAreaElement>);

    act(() => {
      wrapper.find(TagSelector).prop('onTagsSelected')(['im a new tag!']);
    });

    const setDataViewId = (id: string) =>
      (
        wrapper.find(
          "EuiSelect[data-test-subj='annotationDataViewSelection']"
        ) as ReactWrapper<EuiSelectProps>
      ).prop('onChange')!({ target: { value: id } } as React.ChangeEvent<HTMLSelectElement>);

    setDataViewId(dataViewId);
    setDataViewId(adHocDataViewId);

    expect(updateMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "annotations": Array [],
            "dataViewSpec": Object {
              "id": "ad-hoc",
              "title": "Ad Hoc Data View",
            },
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
            "dataViewSpec": Object {
              "id": "ad-hoc",
              "title": "Ad Hoc Data View",
            },
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
            "dataViewSpec": Object {
              "id": "ad-hoc",
              "title": "Ad Hoc Data View",
            },
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
            "dataViewSpec": undefined,
            "description": "",
            "ignoreGlobalFilters": false,
            "indexPatternId": "my-index-pattern",
            "tags": Array [],
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
      ]
    `);
  });

  it('adds a new annotation group', () => {
    act(() => {
      wrapper.find('button[data-test-subj="addAnnotation"]').simulate('click');
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    const newAnnotations = (updateMock.mock.calls[0][0] as EventAnnotationGroupConfig).annotations;
    expect(newAnnotations.length).toBe(group.annotations.length + 1);
    expect(wrapper.exists(AnnotationEditorControls)); // annotation controls opened
  });
});
