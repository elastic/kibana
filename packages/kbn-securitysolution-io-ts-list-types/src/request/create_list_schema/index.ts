/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DefaultVersionNumber,
  DefaultVersionNumberDecoded,
} from '@kbn/securitysolution-io-ts-types';
import * as t from 'io-ts';

import { description } from '../../common/description';
import { deserializer } from '../../common/deserializer';
import { id } from '../../common/id';
import { meta } from '../../common/meta';
import { name } from '../../common/name';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { serializer } from '../../common/serializer';
import { type } from '../../common/type';

export const createListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      name,
      type,
    })
  ),
  t.exact(
    t.partial({
      deserializer, // defaults to undefined if not set during decode
      id, // defaults to undefined if not set during decode
      meta, // defaults to undefined if not set during decode
      serializer, // defaults to undefined if not set during decode
      version: DefaultVersionNumber, // defaults to a numerical 1 if not set during decode
    })
  ),
]);

export type CreateListSchema = t.OutputOf<typeof createListSchema>;
export type CreateListSchemaDecoded = RequiredKeepUndefined<
  Omit<t.TypeOf<typeof createListSchema>, 'version'>
> & { version: DefaultVersionNumberDecoded };
