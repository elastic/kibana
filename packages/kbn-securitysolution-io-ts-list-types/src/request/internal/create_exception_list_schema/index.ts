/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
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
      list_id: t.keyof(
        ENDPOINT_ARTIFACT_LIST_IDS.reduce<Record<string, null>>((mapOfListIds, listId) => {
          mapOfListIds[listId] = null;

          return mapOfListIds;
        }, {})
      ),
    })
  ),
  createExceptionListSchema,
]);

export type InternalCreateExceptionListSchema = t.OutputOf<
  typeof internalCreateExceptionListSchema
>;

// This type is used after a decode since some things are defaults after a decode.
export type InternalCreateExceptionListSchemaDecoded = CreateExceptionListSchemaDecoded;
