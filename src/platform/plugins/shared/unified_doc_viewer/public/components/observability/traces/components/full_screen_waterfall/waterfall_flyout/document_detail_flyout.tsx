/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut } from '@elastic/eui';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import { WaterfallFlyout } from '.';
import type { TraceOverviewSections } from '../../../doc_viewer_overview/overview';
import { spanFlyoutId, SpanFlyoutContent } from './span_flyout';
import { logsFlyoutId, LogFlyoutContent } from './logs_flyout';
import {
  useDocumentFlyoutData,
  type DocumentType,
  type DocumentFlyoutData,
} from './use_document_flyout_data';

export type { DocumentType } from './use_document_flyout_data';

interface FlyoutContentProps {
  data: DocumentFlyoutData;
  dataView: DocViewRenderProps['dataView'];
  activeSection?: TraceOverviewSections;
}

function FlyoutContent({ data, dataView, activeSection }: FlyoutContentProps) {
  if (!data.hit) {
    return null;
  }

  const isSpanType = data.type === spanFlyoutId;
  if (isSpanType) {
    return <SpanFlyoutContent hit={data.hit} dataView={dataView} activeSection={activeSection} />;
  }

  const isLogType = data.type === logsFlyoutId;
  if (isLogType && data.logDataView) {
    return <LogFlyoutContent hit={data.hit} logDataView={data.logDataView} />;
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
  const data = useDocumentFlyoutData({ type, docId, traceId, docIndex });

  return (
    <WaterfallFlyout
      onCloseFlyout={onCloseFlyout}
      dataView={dataView}
      hit={data.hit}
      loading={data.loading}
      title={data.title}
    >
      {data.error && <EuiCallOut announceOnMount title={data.error} color="danger" />}
      {data.hit ? (
        <FlyoutContent data={data} dataView={dataView} activeSection={activeSection} />
      ) : null}
    </WaterfallFlyout>
  );
}
