/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewFieldBase } from '@kbn/es-query';
import type {
  CreateExceptionListItemSchema,
  Entry,
  EntryExists,
  EntryMatch,
  EntryMatchAny,
  EntryMatchWildcard,
  EntryNested,
  ExceptionListItemSchema,
  ListOperatorEnum as OperatorEnum,
  ListOperatorTypeEnum as OperatorTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  EXCEPTION_LIST_NAMESPACE,
  EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
} from '@kbn/securitysolution-list-constants';

export interface OperatorOption {
  message: string;
  value: string;
  operator: OperatorEnum;
  type: OperatorTypeEnum;
}

export interface FormattedBuilderEntry {
  id: string;
  field: DataViewFieldBase | undefined;
  operator: OperatorOption;
  value: string | string[] | undefined;
  nested: 'parent' | 'child' | undefined;
  entryIndex: number;
  parent: { parent: BuilderEntryNested; parentIndex: number } | undefined;
  correspondingKeywordField: DataViewFieldBase | undefined;
}

export interface EmptyEntry {
  id: string;
  field: string | undefined;
  operator: OperatorEnum;
  type: OperatorTypeEnum.MATCH | OperatorTypeEnum.MATCH_ANY | OperatorTypeEnum.WILDCARD;
  value: string | string[] | undefined;
}

export interface EmptyListEntry {
  id: string;
  field: string | undefined;
  operator: OperatorEnum;
  type: OperatorTypeEnum.LIST;
  list: { id: string | undefined; type: string | undefined };
}

export interface EmptyNestedEntry {
  id: string;
  field: string | undefined;
  type: OperatorTypeEnum.NESTED;
  entries: Array<
    | (EntryMatch & { id?: string })
    | (EntryMatchAny & { id?: string })
    | (EntryMatchWildcard & { id?: string })
    | (EntryExists & { id?: string })
  >;
}

export type BuilderEntry =
  | (Entry & { id?: string })
  | EmptyListEntry
  | EmptyEntry
  | BuilderEntryNested
  | EmptyNestedEntry;

export type BuilderEntryNested = Omit<EntryNested, 'entries'> & {
  id?: string;
  entries: Array<
    | (EntryMatch & { id?: string })
    | (EntryMatchAny & { id?: string })
    | (EntryMatchWildcard & { id?: string })
    | (EntryExists & { id?: string })
  >;
};

export type ExceptionListItemBuilderSchema = Omit<ExceptionListItemSchema, 'entries'> & {
  entries: BuilderEntry[];
};

export type CreateExceptionListItemBuilderSchema = Omit<
  CreateExceptionListItemSchema,
  'meta' | 'entries'
> & {
  meta: { temporaryUuid: string };
  entries: BuilderEntry[];
};

export type ExceptionsBuilderExceptionItem =
  | ExceptionListItemBuilderSchema
  | CreateExceptionListItemBuilderSchema;

export const exceptionListSavedObjectType = EXCEPTION_LIST_NAMESPACE;
export const exceptionListAgnosticSavedObjectType = EXCEPTION_LIST_NAMESPACE_AGNOSTIC;
export type SavedObjectType =
  | typeof EXCEPTION_LIST_NAMESPACE
  | typeof EXCEPTION_LIST_NAMESPACE_AGNOSTIC;
