/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { renderWithIntl } from '@kbn/test/jest';
import { ToolBarPagerText } from './tool_bar_pager_text';

test('it renders ToolBarPagerText without crashing', () => {
  const props = {
    startItem: 1,
    endItem: 2,
    totalItems: 3,
  };
  const wrapper = renderWithIntl(<ToolBarPagerText {...props} />);
  expect(wrapper).toMatchSnapshot();
});
