/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { formatId } from './constants';
import { FieldFormatEditorFactory } from '../types';

export type { TruncateFormatEditor } from './truncate';
export const truncateFormatEditorFactory: FieldFormatEditorFactory = () =>
  import('./truncate').then((m) => m.TruncateFormatEditor);
truncateFormatEditorFactory.formatId = formatId;
