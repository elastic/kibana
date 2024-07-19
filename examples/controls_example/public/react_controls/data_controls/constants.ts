/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataControlEditorState } from './open_data_control_editor';
import { DefaultDataControlState } from './types';

export const DEFAULT_DATA_CONTROL_KEYS: Readonly<Array<keyof DefaultDataControlState>> = [
  'grow',
  'width',
  'dataViewId',
  'fieldName',
  'title',
];

export const DEFAULT_DATA_CONTROL_EDITOR_KEYS: Readonly<Array<keyof DataControlEditorState>> = [
  ...DEFAULT_DATA_CONTROL_KEYS,
  'controlType',
  'controlId',
  'defaultPanelTitle',
];
