/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '../../../../monaco_imports';
export declare function esqlValidate(
  model: monaco.editor.ITextModel,
  code?: string,
  callbacks?: ESQLCallbacks,
  options?: {
    invalidateColumnsCache?: boolean;
  },
  token?: monaco.CancellationToken
): Promise<{
  errors: import('@kbn/code-editor').MonacoEditorError[];
  warnings: import('@kbn/code-editor').MonacoEditorError[];
}>;
