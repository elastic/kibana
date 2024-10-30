/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import { exceptionListType } from '../exception_list';
import { namespaceType } from '../default_namespace';

export const list = t.exact(
  t.type({
    id: NonEmptyString,
    list_id: NonEmptyString,
    type: exceptionListType,
    namespace_type: namespaceType,
  })
);

export type List = t.TypeOf<typeof list>;
export const listArray = t.array(list);
export type ListArray = t.TypeOf<typeof listArray>;
export const listArrayOrUndefined = t.union([listArray, t.undefined]);
export type ListArrayOrUndefined = t.TypeOf<typeof listArrayOrUndefined>;
