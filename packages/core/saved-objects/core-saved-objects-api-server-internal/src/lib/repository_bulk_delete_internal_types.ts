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
import { Either } from './internal_utils';

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
 */
export type BulkDeleteExpectedBulkGetResult = Either<
  { type: string; id: string; error: Payload },
  { type: string; id: string; version?: string; esRequestIndex?: number }
>;
