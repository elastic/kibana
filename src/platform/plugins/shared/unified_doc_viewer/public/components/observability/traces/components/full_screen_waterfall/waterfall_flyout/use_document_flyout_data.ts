/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { spanFlyoutId, useSpanFlyoutData } from './span_flyout';
import { useLogFlyoutData } from './logs_flyout';

export type DocumentType = 'spanDetailFlyout' | 'logsFlyout';

export interface UseDocumentFlyoutDataParams {
  type: DocumentType;
  docId: string;
  traceId: string;
  docIndex?: string;
}

/**
 * Base interface that all flyout data hooks must implement.
 * Any new flyout type should extend this interface.
 */
export interface BaseFlyoutData {
  hit: DataTableRecord | null;
  loading: boolean;
  title: string;
  error: string | null;
}

export interface DocumentFlyoutData extends BaseFlyoutData {
  type: DocumentType;
  // Log-specific fields (only present when type is 'logsFlyout')
  logDataView?: DocViewRenderProps['dataView'] | null;
}

/**
 * Unified hook for fetching document flyout data.
 * Orchestrates the individual hooks based on document type.
 * Both hooks are called but short-circuit with empty params when not needed.
 */
export function useDocumentFlyoutData({
  type,
  docId,
  traceId,
  docIndex,
}: UseDocumentFlyoutDataParams): DocumentFlyoutData {
  const isSpanType = type === spanFlyoutId;

  const spanData = useSpanFlyoutData({
    spanId: isSpanType ? docId : '',
    traceId,
  });

  const logData = useLogFlyoutData({
    id: isSpanType ? '' : docId,
    index: docIndex,
  });

  if (isSpanType) {
    return {
      type,
      hit: spanData.hit,
      loading: spanData.loading,
      title: spanData.title,
      error: spanData.error,
    };
  }

  return {
    type,
    hit: logData.hit,
    loading: logData.loading,
    title: logData.title,
    logDataView: logData.logDataView,
    error: logData.error,
  };
}
