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
import { OsTypeArray, osTypeArrayOrUndefined } from '../../common/os_type';
import { RequiredKeepUndefined } from '../../common/required_keep_undefined';
import { Tags, tags } from '../../common/tags';
import { NamespaceType } from '../../common/default_namespace';
import { description } from '../../common/description';
import { name } from '../../common/name';
import { _version } from '../../common/underscore_version';
import { exceptionListType } from '../../common/exception_list';
import { id } from '../../common/id';
import { list_id } from '../../common/list_id';
import { meta } from '../../common/meta';
import { namespace_type } from '../../common/namespace_type';

export const updateExceptionListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      name,
      type: exceptionListType,
    })
  ),
  t.exact(
    t.partial({
      _version, // defaults to undefined if not set during decode
      id, // defaults to undefined if not set during decode
      list_id, // defaults to undefined if not set during decode
      meta, // defaults to undefined if not set during decode
      namespace_type, // defaults to 'single' if not set during decode
      os_types: osTypeArrayOrUndefined, // defaults to empty array if not set during decode
      tags, // defaults to empty array if not set during decode
      version, // defaults to undefined if not set during decode
    })
  ),
]);

export type UpdateExceptionListSchema = t.OutputOf<typeof updateExceptionListSchema>;

// This type is used after a decode since the arrays turn into defaults of empty arrays.
export type UpdateExceptionListSchemaDecoded = Omit<
  RequiredKeepUndefined<t.TypeOf<typeof updateExceptionListSchema>>,
  'tags | namespace_type' | 'os_types'
> & {
  tags: Tags;
  namespace_type: NamespaceType;
  os_types: OsTypeArray;
};
