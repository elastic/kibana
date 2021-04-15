/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { StoryContext, StoryFn as StoryFunction } from '@storybook/addons';

// function updateCss() {}

export const withEuiTheme = (storyFn: StoryFunction, context: StoryContext) => {
  console.log('hello from withEuiThem');
  return storyFn();
};
