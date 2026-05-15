/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateQuery } from '@kbn/esql-language';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '../../../../monaco_imports';
import { createMonacoProvider } from './providers_factory';
import { wrapAsMonacoMessages } from '../converters/positions';

export async function esqlValidate(
  model: monaco.editor.ITextModel,
  code?: string,
  callbacks?: ESQLCallbacks,
  options?: { invalidateColumnsCache?: boolean }
) {
  return createMonacoProvider({
    model,
    run: async (safeModel) => {
      const text = code ?? safeModel.getValue();
      const { errors, warnings } = await validateQuery(text, callbacks, options);
      const monacoErrors = wrapAsMonacoMessages(text, errors);
      const monacoWarnings = wrapAsMonacoMessages(text, warnings);
      return { errors: monacoErrors, warnings: monacoWarnings };
    },
    emptyResult: { errors: [], warnings: [] },
  });
}
