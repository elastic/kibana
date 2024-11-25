/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { _version } from '../../common/underscore_version';
import { id } from '../../common/id';
import { value } from '../../common/value';
import { meta } from '../../common/meta';

export const updateListItemSchema = t.intersection([
  t.exact(
    t.type({
      id,
      value,
    })
  ),
  t.exact(
    t.partial({
      _version, // defaults to undefined if not set during decode
      meta, // defaults to undefined if not set during decode
    })
  ),
]);

export type UpdateListItemSchema = t.OutputOf<typeof updateListItemSchema>;
export type UpdateListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof updateListItemSchema>
>;
