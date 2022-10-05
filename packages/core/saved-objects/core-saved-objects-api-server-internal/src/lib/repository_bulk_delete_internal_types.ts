/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Payload } from '@hapi/boom';
import {
  BulkOperationBase,
  BulkResponseItem,
  ErrorCause,
} from '@elastic/elasticsearch/lib/api/types';
import type { estypes, TransportResult } from '@elastic/elasticsearch';
import { Either } from './internal_utils';
import { DeleteLegacyUrlAliasesParams } from './legacy_url_aliases';

/**
 * @internal
 */
export interface PreflightCheckForBulkDeleteParams {
  expectedBulkGetResults: BulkDeleteExpectedBulkGetResult[];
  namespace?: string;
}

/**
 * @internal
 */
export interface ExpectedBulkDeleteMultiNamespaceDocsParams {
  // contains the type and id of all objects to delete
  expectedBulkGetResults: BulkDeleteExpectedBulkGetResult[];
  // subset of multi-namespace only expectedBulkGetResults
  multiNamespaceDocsResponse: TransportResult<estypes.MgetResponse<unknown>, unknown> | undefined;
  // current namespace in which the bulkDelete call is made
  namespace: string | undefined;
  // optional parameter used to force delete multinamespace objects that exist in more than the current space
  force?: boolean;
}
/**
 * @internal
 */
export interface BulkDeleteParams {
  delete: Omit<BulkOperationBase, 'version' | 'version_type' | 'routing'>;
}

/**
 * @internal
 */
export type ExpectedBulkDeleteResult = Either<
  { type: string; id: string; error: Payload },
  {
    type: string;
    id: string;
    namespaces: string[];
    esRequestIndex: number;
  }
>;

/**
 * @internal
 */
export interface BulkDeleteItemErrorResult {
  success: boolean;
  type: string;
  id: string;
  error: Payload;
}

/**
 * @internal
 */
export type NewBulkItemResponse = BulkResponseItem & { error: ErrorCause & { index: string } };

/**
 * @internal
 * @note Contains all documents for bulk delete, regardless of namespace type
 */
export type BulkDeleteExpectedBulkGetResult = Either<
  { type: string; id: string; error: Payload },
  { type: string; id: string; version?: string; esRequestIndex?: number }
>;

export type ObjectToDeleteAliasesFor = Pick<
  DeleteLegacyUrlAliasesParams,
  'type' | 'id' | 'namespaces' | 'deleteBehavior'
>;
