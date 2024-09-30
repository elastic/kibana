/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { namespace_type } from '../../common/namespace_type';
import { metaOrUndefined } from '../../common/meta';
import { name } from '../../common/name';
import { created_at } from '../../common/created_at';
import { created_by } from '../../common/created_by';
import { id } from '../../common/id';
import { tie_breaker_id } from '../../common/tie_breaker_id';
import { updated_at } from '../../common/updated_at';
import { updated_by } from '../../common/updated_by';
import { list_id } from '../../common/list_id';
import { description } from '../../common/description';
import { osTypeArray } from '../../common/os_type';
import { tags } from '../../common/tags';
import { _versionOrUndefined } from '../../common/underscore_version';
import { commentsArray } from '../../common/comment';
import { entriesArray } from '../../common/entries';
import { item_id } from '../../common/item_id';
import { exceptionListItemType } from '../../common/exception_list_item_type';
import { expireTimeOrUndefined } from '../../common/expire_time';

export const exceptionListItemSchema = t.exact(
  t.type({
    _version: _versionOrUndefined,
    comments: commentsArray,
    created_at,
    created_by,
    description,
    entries: entriesArray,
    expire_time: expireTimeOrUndefined,
    id,
    item_id,
    list_id,
    meta: metaOrUndefined,
    name,
    namespace_type,
    os_types: osTypeArray,
    tags,
    tie_breaker_id,
    type: exceptionListItemType,
    updated_at,
    updated_by,
  })
);

export type ExceptionListItemSchema = t.TypeOf<typeof exceptionListItemSchema>;
