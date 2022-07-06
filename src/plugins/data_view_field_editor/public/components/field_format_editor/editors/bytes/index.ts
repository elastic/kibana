/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { formatId } from './constants';
import { FieldFormatEditorFactory } from '../types';
import { NumberFormatEditorParams } from '../number/number';

export type { BytesFormatEditor } from './bytes';
export const bytesFormatEditorFactory: FieldFormatEditorFactory<NumberFormatEditorParams> = () =>
  import('./bytes').then((m) => m.BytesFormatEditor);
bytesFormatEditorFactory.formatId = formatId;
