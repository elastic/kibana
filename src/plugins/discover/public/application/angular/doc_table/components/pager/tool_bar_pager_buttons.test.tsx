/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { ToolBarPagerButtons } from './tool_bar_pager_buttons';
import { findTestSubject } from '@elastic/eui/lib/test';

test('it renders ToolBarPagerButtons', () => {
  const props = {
    hasPreviousPage: true,
    hasNextPage: true,
    onPageNext: jest.fn(),
    onPagePrevious: jest.fn(),
  };
  const wrapper = shallowWithIntl(<ToolBarPagerButtons {...props} />);
  expect(wrapper).toMatchSnapshot();
});

test('it renders ToolBarPagerButtons with clickable next and previous button', () => {
  const props = {
    hasPreviousPage: true,
    hasNextPage: true,
    onPageNext: jest.fn(),
    onPagePrevious: jest.fn(),
  };
  const wrapper = mountWithIntl(<ToolBarPagerButtons {...props} />);
  findTestSubject(wrapper, 'btnPrevPage').simulate('click');
  expect(props.onPagePrevious).toHaveBeenCalledTimes(1);
  findTestSubject(wrapper, 'btnNextPage').simulate('click');
  expect(props.onPageNext).toHaveBeenCalledTimes(1);
});

test('it renders ToolBarPagerButtons with disabled next and previous button', () => {
  const props = {
    hasPreviousPage: false,
    hasNextPage: false,
    onPageNext: jest.fn(),
    onPagePrevious: jest.fn(),
  };
  const wrapper = mountWithIntl(<ToolBarPagerButtons {...props} />);
  findTestSubject(wrapper, 'btnPrevPage').simulate('click');
  expect(props.onPagePrevious).toHaveBeenCalledTimes(0);
  findTestSubject(wrapper, 'btnNextPage').simulate('click');
  expect(props.onPageNext).toHaveBeenCalledTimes(0);
});
