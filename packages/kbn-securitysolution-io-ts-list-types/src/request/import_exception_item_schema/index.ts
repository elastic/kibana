/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import { ExpireTimeOrUndefined, ImportCommentsArray, expireTimeOrUndefined } from '../../common';
import { created_at } from '../../common/created_at';
import { created_by } from '../../common/created_by';
import { DefaultImportCommentsArray } from '../../common/default_import_comments_array';
import { NamespaceType } from '../../common/default_namespace';
import { description } from '../../common/description';
import { EntriesArray } from '../../common/entries';
import { exceptionListItemType } from '../../common/exception_list_item_type';
import { id } from '../../common/id';
import { item_id } from '../../common/item_id';
import { ItemId } from '../../common/item_id';
import { list_id } from '../../common/list_id';
import { meta } from '../../common/meta';
import { name } from '../../common/name';
import { namespace_type } from '../../common/namespace_type';
import { nonEmptyEntriesArray } from '../../common/non_empty_entries_array';
import { OsTypeArray, osTypeArrayOrUndefined } from '../../common/os_type';
import { Tags } from '../../common/tags';
import { tags } from '../../common/tags';
import { tie_breaker_id } from '../../common/tie_breaker_id';
import { _version } from '../../common/underscore_version';
import { updated_at } from '../../common/updated_at';
import { updated_by } from '../../common/updated_by';

/**
 * Differences from this and the createExceptionsListItemSchema are
 *   - item_id is required
 *   - id is optional (but ignored in the import code - item_id is exclusively used for imports)
 *   - immutable is optional but if it is any value other than false it will be rejected
 *   - created_at is optional (but ignored in the import code)
 *   - updated_at is optional (but ignored in the import code)
 *   - created_by is optional (but ignored in the import code)
 *   - updated_by is optional (but ignored in the import code)
 */
export const importExceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      description,
      entries: nonEmptyEntriesArray,
      item_id,
      list_id,
      name,
      type: exceptionListItemType,
    })
  ),
  t.exact(
    t.partial({
      id, // defaults to undefined if not set during decode
      comments: DefaultImportCommentsArray, // defaults to empty array if not set during decode
      created_at, // defaults undefined if not set during decode
      updated_at, // defaults undefined if not set during decode
      created_by, // defaults undefined if not set during decode
      updated_by, // defaults undefined if not set during decode
      _version, // defaults to undefined if not set during decode
      tie_breaker_id,
      meta, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
      expire_time: expireTimeOrUndefined,
    })
  ),
]);

export type ImportExceptionListItemSchema = t.OutputOf<typeof importExceptionListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type ImportExceptionListItemSchemaDecoded = Omit<
  ImportExceptionListItemSchema,
  'tags' | 'item_id' | 'entries' | 'namespace_type' | 'comments' | 'expire_time'
> & {
  comments: ImportCommentsArray;
  tags: Tags;
  item_id: ItemId;
  entries: EntriesArray;
  namespace_type: NamespaceType;
  os_types: OsTypeArray;
  expire_time: ExpireTimeOrUndefined;
};
