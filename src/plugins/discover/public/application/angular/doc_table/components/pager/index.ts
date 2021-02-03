/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ToolBarPagerText } from './tool_bar_pager_text';
import { ToolBarPagerButtons } from './tool_bar_pager_buttons';

export function createToolBarPagerTextDirective(reactDirective: any) {
  return reactDirective(ToolBarPagerText);
}

export function createToolBarPagerButtonsDirective(reactDirective: any) {
  return reactDirective(ToolBarPagerButtons);
}
