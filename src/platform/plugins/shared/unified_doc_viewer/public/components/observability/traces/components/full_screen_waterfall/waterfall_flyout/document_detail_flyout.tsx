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
import React from 'react';
import { WaterfallFlyout } from '.';
import type { TraceOverviewSections } from '../../../doc_viewer_overview/overview';
import { spanFlyoutId, useSpanFlyoutData, SpanFlyoutContent } from './span_flyout';
import type { logsFlyoutId } from './logs_flyout';
import { useLogFlyoutData, LogFlyoutContent, type LogFlyoutData } from './logs_flyout';

export type DocumentType = typeof spanFlyoutId | typeof logsFlyoutId;

interface FlyoutContentProps {
  type: DocumentType;
  hit: DataTableRecord;
  spanData: { dataView: DocViewRenderProps['dataView']; activeSection?: TraceOverviewSections };
  logData: LogFlyoutData;
}

function FlyoutContent({ type, hit, spanData, logData }: FlyoutContentProps) {
  if (type === spanFlyoutId) {
    return <SpanFlyoutContent hit={hit} {...spanData} />;
  }

  if (logData.logDataView) {
    return <LogFlyoutContent hit={hit} logDataView={logData.logDataView} error={logData.error} />;
  }

  return null;
}

export interface DocumentDetailFlyoutProps {
  type: DocumentType;
  docId: string;
  docIndex?: string;
  traceId: string;
  dataView: DocViewRenderProps['dataView'];
  onCloseFlyout: () => void;
  activeSection?: TraceOverviewSections;
}

export function DocumentDetailFlyout({
  type,
  docId,
  docIndex,
  traceId,
  dataView,
  onCloseFlyout,
  activeSection,
}: DocumentDetailFlyoutProps) {
  const isSpanType = type === spanFlyoutId;

  const spanData = useSpanFlyoutData({
    spanId: isSpanType ? docId : '',
    traceId,
  });

  const logData = useLogFlyoutData({
    id: isSpanType ? '' : docId,
    index: docIndex,
  });

  const { hit, loading, title } = isSpanType ? spanData : logData;

  return (
    <WaterfallFlyout
      onCloseFlyout={onCloseFlyout}
      dataView={dataView}
      hit={hit}
      loading={loading}
      title={title}
    >
      {hit ? (
        <FlyoutContent
          type={type}
          hit={hit}
          spanData={{ dataView, activeSection }}
          logData={logData}
        />
      ) : null}
    </WaterfallFlyout>
  );
}
