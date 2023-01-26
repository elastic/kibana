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
import { buildDataTableRecord } from '@kbn/discover-plugin/public/utils/build_data_record';
import { dataViewMock } from '@kbn/discover-plugin/public/__mocks__/data_view';

describe('DocViewerTab', () => {
  test('changing columns triggers an update', () => {
    const hit = buildDataTableRecord({ _index: 'test', _id: '1' }, dataViewMock);
    const props = {
      title: 'test',
      component: jest.fn(),
      id: 1,
      render: jest.fn(),
      renderProps: {
        hit,
        columns: ['test'],
        dataView: dataViewMock,
      },
    };

    const wrapper = shallow(<DocViewerTab {...props} />);

    const nextProps = {
      ...props,
      renderProps: {
        hit,
        columns: ['test2'],
        dataView: dataViewMock,
      },
    };

    const shouldUpdate = (wrapper!.instance() as DocViewerTab).shouldComponentUpdate(nextProps, {
      hasError: false,
      error: '',
    });
    expect(shouldUpdate).toBe(true);
  });
});
