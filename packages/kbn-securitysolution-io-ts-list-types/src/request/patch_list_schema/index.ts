/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { version } from '@kbn/securitysolution-io-ts-types';

import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { id } from '../../common/id';
import { _version } from '../../common/underscore_version';
import { meta } from '../../common/meta';
import { name } from '../../common/name';
import { description } from '../../common/description';

export const patchListSchema = t.intersection([
  t.exact(
    t.type({
      id,
    })
  ),
  t.exact(
    t.partial({
      _version, // is undefined if not set during decode
      description, // is undefined if not set during decode
      meta, // is undefined if not set during decode
      name, // is undefined if not set during decode
      version, // is undefined if not set during decode
    })
  ),
]);

export type PatchListSchema = t.OutputOf<typeof patchListSchema>;
export type PatchListSchemaDecoded = RequiredKeepUndefined<t.TypeOf<typeof patchListSchema>>;
