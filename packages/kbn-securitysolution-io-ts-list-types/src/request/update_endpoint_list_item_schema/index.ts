/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

import { DefaultUpdateCommentsArray } from '../../common/default_update_comments_array';
import { exceptionListItemType } from '../../common/exception_list_item_type';
import { nonEmptyEntriesArray } from '../../common/non_empty_entries_array';
import { OsTypeArray, osTypeArrayOrUndefined } from '../../common/os_type';
import { description } from '../../common/description';
import { name } from '../../common/name';
import { _version } from '../../common/underscore_version';
import { id } from '../../common/id';
import { meta } from '../../common/meta';
import { Tags, tags } from '../../common/tags';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { UpdateCommentsArray } from '../../common/update_comment';
import { EntriesArray } from '../../common/entries';

export const updateEndpointListItemSchema = t.intersection([
  t.exact(
    t.type({
      description,
      entries: nonEmptyEntriesArray,
      name,
      type: exceptionListItemType,
    })
  ),
  t.exact(
    t.partial({
      _version, // defaults to undefined if not set during decode
      comments: DefaultUpdateCommentsArray, // defaults to empty array if not set during decode
      id, // defaults to undefined if not set during decode
      item_id: t.union([t.string, t.undefined]),
      meta, // defaults to undefined if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
    })
  ),
]);

export type UpdateEndpointListItemSchema = t.OutputOf<typeof updateEndpointListItemSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type UpdateEndpointListItemSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof updateEndpointListItemSchema>>,
  'tags' | 'entries' | 'comments'
> & {
  comments: UpdateCommentsArray;
  tags: Tags;
  entries: EntriesArray;
  os_types: OsTypeArray;
};
