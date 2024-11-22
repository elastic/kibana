/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { DefaultUuid } from '@kbn/securitysolution-io-ts-types';

import { DefaultCreateCommentsArray } from '../../common/default_create_comments_array';
import { CreateCommentsArray } from '../../common/create_comment';
import { Tags } from '../../common/tags';
import { ItemId } from '../../common/item_id';
import { EntriesArray } from '../../common/entries';
import { NamespaceType } from '../../common/default_namespace';
import { OsTypeArray, osTypeArrayOrUndefined } from '../../common/os_type';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { description } from '../../common/description';
import { list_id } from '../../common/list_id';
import { name } from '../../common/name';
import { exceptionListItemType } from '../../common/exception_list_item_type';
import { meta } from '../../common/meta';
import { namespace_type } from '../../common/namespace_type';
import { tags } from '../../common/tags';
import { nonEmptyEntriesArray } from '../../common/non_empty_entries_array';
import { ExpireTimeOrUndefined, expireTimeOrUndefined } from '../../common';

export const createExceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      description,
      entries: nonEmptyEntriesArray,
      list_id,
      name,
      type: exceptionListItemType,
    })
  ),
  t.exact(
    t.partial({
      comments: DefaultCreateCommentsArray, // defaults to empty array if not set during decode
      expire_time: expireTimeOrUndefined,
      item_id: DefaultUuid, // defaults to GUID (uuid v4) if not set during decode
      meta, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type CreateExceptionListItemSchema = t.OutputOf<typeof createExceptionListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type CreateExceptionListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof createExceptionListItemSchema>>,
  'tags' | 'item_id' | 'entries' | 'namespace_type' | 'comments' | 'expire_time'
> & {
  comments: CreateCommentsArray;
  expire_time: ExpireTimeOrUndefined;
  tags: Tags;
  item_id: ItemId;
  entries: EntriesArray;
  namespace_type: NamespaceType;
  os_types: OsTypeArray;
};
