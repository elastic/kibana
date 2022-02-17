/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldFormatEditorFactory } from '../types';
import { formatId } from './constants';

export type { FormatEditorState } from './default';
export { defaultState } from './default';
export type { FormatEditorProps } from '../types';
export type { DefaultFormatEditor } from './default';

export const defaultFormatEditorFactory: FieldFormatEditorFactory = () =>
  import('./default').then((m) => m.DefaultFormatEditor);
defaultFormatEditorFactory.formatId = formatId;
