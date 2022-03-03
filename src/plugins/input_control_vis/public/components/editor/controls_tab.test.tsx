/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithIntl, mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { getDepsMock, getIndexPatternMock } from '../../test_utils';
import ControlsTab, { ControlsTabProps } from './controls_tab';
import { Vis } from '../../../../visualizations/public';

const indexPatternsMock = {
  get: getIndexPatternMock,
};
let props: ControlsTabProps;

beforeEach(() => {
  props = {
    deps: getDepsMock(),
    vis: {
      API: {
        indexPatterns: indexPatternsMock,
      },
      type: {
        name: 'test',
        title: 'test',
        visualization: null,
        stage: 'beta',
        requiresSearch: false,
        hidden: false,
      },
    } as unknown as Vis,
    stateParams: {
      controls: [
        {
          id: '1',
          indexPattern: 'indexPattern1',
          fieldName: 'keywordField',
          label: 'custom label',
          type: 'list',
          options: {
            type: 'terms',
            multiselect: true,
            size: 5,
            order: 'desc',
          },
          parent: 'parent',
        },
        {
          id: '2',
          indexPattern: 'indexPattern1',
          fieldName: 'numberField',
          label: '',
          type: 'range',
          options: {
            step: 1,
          },
          parent: 'parent',
        },
      ],
    },
    setValue: jest.fn(),
    intl: null as any,
  } as unknown as ControlsTabProps;
});

test('renders ControlsTab', () => {
  const component = shallowWithIntl(<ControlsTab {...props} />);

  expect(component).toMatchSnapshot();
});

describe('behavior', () => {
  test('add control button', () => {
    const component = mountWithIntl(<ControlsTab {...props} />);

    findTestSubject(component, 'inputControlEditorAddBtn').simulate('click');

    // // Use custom match function since control.id is dynamically generated and never the same.
    expect(props.setValue).toHaveBeenCalledWith(
      'controls',
      expect.arrayContaining(props.stateParams.controls)
    );
    expect((props.setValue as jest.Mock).mock.calls[0][1].length).toEqual(3);
  });

  test('remove control button', () => {
    const component = mountWithIntl(<ControlsTab {...props} />);
    findTestSubject(component, 'inputControlEditorRemoveControl0').simulate('click');
    const expectedParams = [
      'controls',
      [
        {
          id: '2',
          indexPattern: 'indexPattern1',
          fieldName: 'numberField',
          label: '',
          type: 'range',
          parent: 'parent',
          options: {
            step: 1,
          },
        },
      ],
    ];

    expect(props.setValue).toHaveBeenCalledWith(...expectedParams);
  });

  test('move down control button', () => {
    const component = mountWithIntl(<ControlsTab {...props} />);
    findTestSubject(component, 'inputControlEditorMoveDownControl0').simulate('click');
    const expectedParams = [
      'controls',
      [
        {
          id: '2',
          indexPattern: 'indexPattern1',
          fieldName: 'numberField',
          label: '',
          type: 'range',
          parent: 'parent',
          options: {
            step: 1,
          },
        },
        {
          id: '1',
          indexPattern: 'indexPattern1',
          fieldName: 'keywordField',
          label: 'custom label',
          type: 'list',
          parent: 'parent',
          options: {
            type: 'terms',
            multiselect: true,
            size: 5,
            order: 'desc',
          },
        },
      ],
    ];

    expect(props.setValue).toHaveBeenCalledWith(...expectedParams);
  });

  test('move up control button', () => {
    const component = mountWithIntl(<ControlsTab {...props} />);
    findTestSubject(component, 'inputControlEditorMoveUpControl1').simulate('click');
    const expectedParams = [
      'controls',
      [
        {
          id: '2',
          indexPattern: 'indexPattern1',
          fieldName: 'numberField',
          label: '',
          type: 'range',
          parent: 'parent',
          options: {
            step: 1,
          },
        },
        {
          id: '1',
          indexPattern: 'indexPattern1',
          fieldName: 'keywordField',
          label: 'custom label',
          type: 'list',
          parent: 'parent',
          options: {
            type: 'terms',
            multiselect: true,
            size: 5,
            order: 'desc',
          },
        },
      ],
    ];

    expect(props.setValue).toHaveBeenCalledWith(...expectedParams);
  });
});
