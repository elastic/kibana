/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from '../context';
import type { IO, IOResponse } from '../io';
import type { OutdatedDocumentsState } from '../migration_state';
import { retry } from '../retry';
import { resetRetry, type StateOf } from '../state';
import { assertNever, type Step, type SuccessorsOf } from '../types';
import * as UPDATE_DOCUMENT_MODEL_VERSIONS from './update_document_model_versions';

export const Name = 'OUTDATED_DOCUMENTS_SEARCH_REFRESH' as const;

/** Refreshes the index, so that the converted documents are visible. */
export interface State extends OutdatedDocumentsState {
  readonly controlState: typeof Name;
}

type Successors = SuccessorsOf<typeof Name>;

export const step = (
  state: State,
  io: IO,
  context: MigrationContext
): Step<Successors, IOResponse<'refreshIndex'>> => ({
  action: () => io.refreshIndex(state.currentIndex),
  transition: (response): StateOf<Successors> => {
    switch (response.type) {
      case 'retryable_es_client_error':
        return retry(state, response.message, context.maxRetryAttempts);
      case 'success':
        return { ...resetRetry(state), controlState: UPDATE_DOCUMENT_MODEL_VERSIONS.Name };
      default:
        return assertNever(response);
    }
  },
});
