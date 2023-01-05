/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';

import {
  DefaultVersionNumber,
  DefaultVersionNumberDecoded,
  OnlyFalseAllowed,
} from '@kbn/securitysolution-io-ts-types';

import { exceptionListType } from '../../common/exception_list';
import { OsTypeArray, osTypeArrayOrUndefined } from '../../common/os_type';
import { Tags } from '../../common/tags';
import { ListId } from '../../common/list_id';
import { NamespaceType } from '../../common/default_namespace';
import { name } from '../../common/name';
import { description } from '../../common/description';
import { namespace_type } from '../../common/namespace_type';
import { tags } from '../../common/tags';
import { meta } from '../../common/meta';
import { list_id } from '../../common/list_id';
import { id } from '../../common/id';
import { created_at } from '../../common/created_at';
import { created_by } from '../../common/created_by';
import { updated_at } from '../../common/updated_at';
import { updated_by } from '../../common/updated_by';
import { _version } from '../../common/underscore_version';
import { tie_breaker_id } from '../../common/tie_breaker_id';

/**
 * Differences from this and the createExceptionsSchema are
 *   - list_id is required
 *   - id is optional (but ignored in the import code - list_id is exclusively used for imports)
 *   - immutable is optional but if it is any value other than false it will be rejected
 *   - created_at is optional (but ignored in the import code)
 *   - updated_at is optional (but ignored in the import code)
 *   - created_by is optional (but ignored in the import code)
 *   - updated_by is optional (but ignored in the import code)
 */
export const importExceptionsListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      name,
      type: exceptionListType,
      list_id,
    })
  ),
  t.exact(
    t.partial({
      id, // defaults to undefined if not set during decode
      immutable: OnlyFalseAllowed,
      meta, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
      created_at, // defaults "undefined" if not set during decode
      updated_at, // defaults "undefined" if not set during decode
      created_by, // defaults "undefined" if not set during decode
      updated_by, // defaults "undefined" if not set during decode
      _version, // defaults to undefined if not set during decode
      tie_breaker_id,
      version: DefaultVersionNumber, // defaults to numerical 1 if not set during decode
    })
  ),
]);

export type ImportExceptionsListSchema = t.TypeOf<typeof importExceptionsListSchema>;

// This type is used after a decode since some things are defaults after a decode.
export type ImportExceptionListSchemaDecoded = Omit<
  ImportExceptionsListSchema,
  'tags' | 'list_id' | 'namespace_type' | 'os_types' | 'immutable'
> & {
  immutable: false;
  tags: Tags;
  list_id: ListId;
  namespace_type: NamespaceType;
  os_types: OsTypeArray;
  version: DefaultVersionNumberDecoded;
};
