/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ChangeEvent, FormEvent } from 'react';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import { getDefaultManualAnnotation } from '@kbn/event-annotation-common';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { GroupEditorControls } from './group_editor_controls';
import { EuiTextAreaProps, EuiTextProps } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import { act } from 'react-dom/test-utils';
import type { QueryInputServices } from '@kbn/visualization-ui-components';
import { AnnotationEditorControls } from '@kbn/event-annotation-components';

jest.mock('@elastic/eui', () => {
  return {
    ...jest.requireActual('@elastic/eui'),
    EuiDatePicker: () => <></>, // for some reason this component caused an infinite loop when the props updated
  };
});

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
  let setSelectedAnnotationMock: jest.Mock;

  const TagSelector = (_props: { onTagsSelected: (tags: string[]) => void }) => <div />;

  beforeEach(async () => {
    updateMock = jest.fn();
    setSelectedAnnotationMock = jest.fn();

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
        setSelectedAnnotation={setSelectedAnnotationMock}
        queryInputServices={{} as QueryInputServices}
        showValidation={false}
        isAdHocDataView={() => false}
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

    // TODO - reenable data view selection tests when ENABLE_INDIVIDUAL_ANNOTATION_EDITING is set to true!
    // this will happen in https://github.com/elastic/kibana/issues/158774

    // const setDataViewId = (id: string) =>
    //   (
    //     wrapper.find(
    //       "EuiSelect[data-test-subj='annotationDataViewSelection']"
    //     ) as ReactWrapper<EuiSelectProps>
    //   ).prop('onChange')!({ target: { value: id } } as React.ChangeEvent<HTMLSelectElement>);

    // setDataViewId(dataViewId);
    // setDataViewId(adHocDataViewId);

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
      ]
    `);
  });

  // it('adds a new annotation group', () => {
  //   act(() => {
  //     wrapper.find('button[data-test-subj="addAnnotation"]').simulate('click');
  //   });

  //   expect(updateMock).toHaveBeenCalledTimes(2);
  //   const newAnnotations = (updateMock.mock.calls[0][0] as EventAnnotationGroupConfig).annotations;
  //   expect(newAnnotations.length).toBe(group.annotations.length + 1);
  //   expect(wrapper.exists(AnnotationEditorControls)); // annotation controls opened
  // });

  it('incorporates annotation updates into group', () => {
    const annotations = [getDefaultManualAnnotation('1', ''), getDefaultManualAnnotation('2', '')];

    act(() => {
      wrapper.setProps({
        selectedAnnotation: annotations[0],
        group: { ...group, annotations },
      });
    });

    wrapper.find(AnnotationEditorControls).prop('onAnnotationChange')({
      ...annotations[0],
      color: 'newColor',
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0].annotations[0].color).toBe('newColor');
    expect(setSelectedAnnotationMock).toHaveBeenCalledTimes(1);
  });

  it('removes an annotation from a group', () => {
    const annotations = [getDefaultManualAnnotation('1', ''), getDefaultManualAnnotation('2', '')];

    act(() => {
      wrapper.setProps({
        group: { ...group, annotations },
      });
    });

    act(() => {
      wrapper
        .find('button[data-test-subj="indexPattern-dimension-remove"]')
        .last()
        .simulate('click');
    });

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock.mock.calls[0][0].annotations).toEqual(annotations.slice(0, 1));
  });
});
