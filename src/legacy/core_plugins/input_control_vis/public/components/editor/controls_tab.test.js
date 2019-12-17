/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

jest.mock('../../../../../core_plugins/data/public/legacy', () => ({
  indexPatterns: {
    indexPatterns: {
      get: jest.fn(),
    },
  },
}));

jest.mock('ui/new_platform', () => ({
  npStart: {
    plugins: {
      data: {
        ui: {
          IndexPatternSelect: () => {
            return <div />;
          },
        },
      },
    },
  },
}));

import React from 'react';
import { shallowWithIntl, mountWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject } from '@elastic/eui/lib/test';
import { getIndexPatternMock } from './__tests__/get_index_pattern_mock';
import { ControlsTab } from './controls_tab';

const indexPatternsMock = {
  get: getIndexPatternMock,
};
let props;

beforeEach(() => {
  props = {
    vis: {
      API: {
        indexPatterns: indexPatternsMock,
      },
    },
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
        },
      ],
    },
    setValue: jest.fn(),
  };
});

test('renders ControlsTab', () => {
  const component = shallowWithIntl(<ControlsTab.WrappedComponent {...props} />);

  expect(component).toMatchSnapshot();
});

describe('behavior', () => {
  test('add control button', () => {
    const component = mountWithIntl(<ControlsTab.WrappedComponent {...props} />);

    findTestSubject(component, 'inputControlEditorAddBtn').simulate('click');

    // // Use custom match function since control.id is dynamically generated and never the same.
    expect(props.setValue).toHaveBeenCalledWith(
      'controls',
      expect.arrayContaining(props.stateParams.controls)
    );
    expect(props.setValue.mock.calls[0][1].length).toEqual(3);
  });

  test('remove control button', () => {
    const component = mountWithIntl(<ControlsTab.WrappedComponent {...props} />);
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
          options: {
            step: 1,
          },
        },
      ],
    ];

    expect(props.setValue).toHaveBeenCalledWith(...expectedParams);
  });

  test('move down control button', () => {
    const component = mountWithIntl(<ControlsTab.WrappedComponent {...props} />);
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
    const component = mountWithIntl(<ControlsTab.WrappedComponent {...props} />);
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
