/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLControlVariable } from '@kbn/esql-types';
import type { Subject } from 'rxjs';
import type { FetchContext } from './fetch_context';

export interface ComposableFetchContext {
  filters?: FetchContext['filters'];
  timeSlice?: FetchContext['timeslice'];
  esqlVariables?: ESQLControlVariable[];
}

/**
 * composableFetchContext$ is a subject and not a publishing subject. New events should only be pushed to it
 * when it is known that the composable fetch context has changed. Initialization logic is handled separately.
 */
export interface PublishesComposableFetchContext {
  composableFetchContext$: Subject<ComposableFetchContext>;
}

export const apiPublishesComposableFetchContext = (
  api: unknown
): api is PublishesComposableFetchContext => {
  return (
    typeof api === 'object' &&
    api !== null &&
    'composableFetchContext$' in api &&
    typeof (api as PublishesComposableFetchContext).composableFetchContext$ === 'object' &&
    (api as PublishesComposableFetchContext).composableFetchContext$ !== null
  );
};
