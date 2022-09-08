/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ENDPOINT_BLOCKLISTS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import * as t from 'io-ts';

import {
  createExceptionListSchema,
  CreateExceptionListSchemaDecoded,
} from '../../create_exception_list_schema';

export const internalCreateExceptionListSchema = t.intersection([
  t.exact(
    t.type({
      type: t.keyof({
        endpoint: null,
        endpoint_events: null,
        endpoint_host_isolation_exceptions: null,
        endpoint_blocklists: null,
      }),
    })
  ),
  t.exact(
    t.partial({
      // TODO: Move the ALL_ENDPOINT_ARTIFACT_LIST_IDS inside the package and use it here instead
      list_id: t.keyof({
        [ENDPOINT_TRUSTED_APPS_LIST_ID]: null,
        [ENDPOINT_EVENT_FILTERS_LIST_ID]: null,
        [ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID]: null,
        [ENDPOINT_BLOCKLISTS_LIST_ID]: null,
      }),
    })
  ),
  createExceptionListSchema,
]);

export type InternalCreateExceptionListSchema = t.OutputOf<
  typeof internalCreateExceptionListSchema
>;

// This type is used after a decode since some things are defaults after a decode.
export type InternalCreateExceptionListSchemaDecoded = CreateExceptionListSchemaDecoded;
