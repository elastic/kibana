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
import { _versionOrUndefined } from '../../common/underscore_version';
import { deserializerOrUndefined } from '../../common/deserializer';
import { metaOrUndefined } from '../../common/meta';
import { serializerOrUndefined } from '../../common/serializer';
import { created_at } from '../../common/created_at';
import { timestampOrUndefined } from '../../common/timestamp';
import { created_by } from '../../common/created_by';
import { description } from '../../common/description';
import { id } from '../../common/id';
import { immutable } from '../../common/immutable';
import { name } from '../../common/name';
import { tie_breaker_id } from '../../common/tie_breaker_id';
import { type } from '../../common/type';
import { updated_at } from '../../common/updated_at';
import { updated_by } from '../../common/updated_by';

export const listSchema = t.exact(
  t.type({
    _version: _versionOrUndefined,
    '@timestamp': timestampOrUndefined,
    created_at,
    created_by,
    description,
    deserializer: deserializerOrUndefined,
    id,
    immutable,
    meta: metaOrUndefined,
    name,
    serializer: serializerOrUndefined,
    tie_breaker_id,
    type,
    updated_at,
    updated_by,
    version,
  })
);

export type ListSchema = t.TypeOf<typeof listSchema>;

export const listArraySchema = t.array(listSchema);
export type ListArraySchema = t.TypeOf<typeof listArraySchema>;
