/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { LangValidation, SyntaxErrors } from '../../types';
import type { PainlessContext, PainlessAutocompleteField } from './types';
import type { PainlessCompletionAdapter } from './completion_adapter';
export declare const getSuggestionProvider: (
  context: PainlessContext,
  fields?: PainlessAutocompleteField[]
) => PainlessCompletionAdapter;
export declare const getSyntaxErrors: () => SyntaxErrors;
export declare const validation$: () => Observable<LangValidation>;
