/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DefaultStringBooleanFalse } from '@kbn/securitysolution-io-ts-types';
import * as t from 'io-ts';

import { id } from '../../common/id';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';

export const deleteListSchema = t.intersection([
  t.exact(
    t.type({
      id,
    })
  ),
  t.exact(
    t.partial({
      deleteReferences: DefaultStringBooleanFalse,
      ignoreReferences: DefaultStringBooleanFalse,
    })
  ),
]);

export type DeleteListSchema = RequiredKeepUndefined<t.TypeOf<typeof deleteListSchema>>;
export type DeleteListSchemaEncoded = t.OutputOf<typeof deleteListSchema>;
