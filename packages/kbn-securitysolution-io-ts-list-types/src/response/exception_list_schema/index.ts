/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { version } from '@kbn/securitysolution-io-ts-types';
import { created_at } from '../../common/created_at';
import { created_by } from '../../common/created_by';
import { description } from '../../common/description';
import { exceptionListType } from '../../common/exception_list';
import { id } from '../../common/id';
import { immutable } from '../../common/immutable';
import { list_id } from '../../common/list_id';
import { metaOrUndefined } from '../../common/meta';
import { name } from '../../common/name';
import { namespace_type } from '../../common/namespace_type';
import { osTypeArray } from '../../common/os_type';
import { tags } from '../../common/tags';
import { tie_breaker_id } from '../../common/tie_breaker_id';
import { _versionOrUndefined } from '../../common/underscore_version';
import { updated_at } from '../../common/updated_at';
import { updated_by } from '../../common/updated_by';

export const exceptionListSchema = t.exact(
  t.type({
    _version: _versionOrUndefined,
    created_at,
    created_by,
    description,
    id,
    immutable,
    list_id,
    meta: metaOrUndefined,
    name,
    namespace_type,
    os_types: osTypeArray,
    tags,
    tie_breaker_id,
    type: exceptionListType,
    updated_at,
    updated_by,
    version,
  })
);

export type ExceptionListSchema = t.TypeOf<typeof exceptionListSchema>;
