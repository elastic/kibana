/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { DocViewerTab } from './doc_viewer_tab';
import { indexPatternMock } from '../../../../__mocks__/index_pattern';
import { buildDataTableRecord } from '../../../../utils/build_data_record';

describe('DocViewerTab', () => {
  test('changing columns triggers an update', () => {
    const hit = buildDataTableRecord({ _index: 'test', _id: '1' }, indexPatternMock);
    const props = {
      title: 'test',
      component: jest.fn(),
      id: 1,
      render: jest.fn(),
      renderProps: {
        hit,
        columns: ['test'],
        indexPattern: indexPatternMock,
      },
    };

    const wrapper = shallow(<DocViewerTab {...props} />);

    const nextProps = {
      ...props,
      renderProps: {
        hit,
        columns: ['test2'],
        indexPattern: indexPatternMock,
      },
    };

    const shouldUpdate = (wrapper!.instance() as DocViewerTab).shouldComponentUpdate(nextProps, {
      hasError: false,
      error: '',
    });
    expect(shouldUpdate).toBe(true);
  });
});
