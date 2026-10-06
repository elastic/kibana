/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TransformErrorObjects } from '../core';
import type { DocumentIdAndType } from '../actions';
/**
 * Constructs migration failure message strings from corrupt document ids and document transformation errors
 */
export declare function extractTransformFailuresReason(
  resolveMigrationFailuresUrl: string,
  corruptDocumentIds: string[],
  transformErrors: TransformErrorObjects[]
): string;
export declare function extractDiscardedUnknownDocs(unknownDocs: DocumentIdAndType[]): string;
export declare function extractUnknownDocFailureReason(
  resolveMigrationFailuresUrl: string,
  unknownDocs: DocumentIdAndType[]
): string;
export declare function extractDiscardedCorruptDocs(
  corruptDocumentIds: string[],
  transformErrors: TransformErrorObjects[]
): string;
/**
 * Constructs migration failure message string for doc exceeds max batch size in bytes
 */
export declare const fatalReasonDocumentExceedsMaxBatchSizeBytes: ({
  _id,
  docSizeBytes,
  maxBatchSizeBytes,
}: {
  _id: string;
  docSizeBytes: number;
  maxBatchSizeBytes: number;
}) => string;
