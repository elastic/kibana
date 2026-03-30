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
import { LogFlyoutContent } from './logs_flyout';
import {
  useDocumentFlyoutData,
  type DocumentType,
  type DocumentFlyoutData,
} from './use_document_flyout_data';
import { FlyoutContentId } from '../../../common/constants';

export type { DocumentType } from './use_document_flyout_data';

interface FlyoutContentProps {
  data: DocumentFlyoutData;
  dataView: DocViewRenderProps['dataView'];
  activeSection?: TraceOverviewSections;
}

interface FlyoutConfig {
  contentId: FlyoutContentId;
  render: (params: FlyoutContentProps) => React.ReactNode;
}

const getFlyoutConfig = (type: DocumentType): FlyoutConfig => {
  if (type === spanFlyoutId) {
    return {
      contentId: FlyoutContentId.SPAN_DETAIL,
      render: ({ data, dataView, activeSection }) => {
        if (!data.hit) return null;

        return (
          <SpanFlyoutContent hit={data.hit} dataView={dataView} activeSection={activeSection} />
        );
      },
    };
  }

  // if it's not a span flyout, it's a logs flyout
  return {
    contentId: FlyoutContentId.LOG_DETAIL,
    render: ({ data }) => {
      if (!data.hit || !data.logDataView) return null;

      return <LogFlyoutContent hit={data.hit} logDataView={data.logDataView} />;
    },
  };
};

export interface DocumentDetailFlyoutProps {
  type: DocumentType;
  docId: string;
  docIndex?: string;
  traceId: string;
  dataView: DocViewRenderProps['dataView'];
  dataTestSubj?: string;
  onCloseFlyout: () => void;
  activeSection?: TraceOverviewSections;
  skipNextEventReport?: boolean;
}

export function DocumentDetailFlyout({
  type,
  docId,
  docIndex,
  traceId,
  dataView,
  dataTestSubj,
  onCloseFlyout,
  activeSection,
  skipNextEventReport,
}: DocumentDetailFlyoutProps) {
  const data = useDocumentFlyoutData({ type, docId, traceId, docIndex });

  const flyoutConfig = getFlyoutConfig(type);

  return (
    <WaterfallFlyout
      onCloseFlyout={onCloseFlyout}
      dataView={dataView}
      hit={data.hit}
      loading={data.loading}
      title={data.title}
      dataTestSubj={dataTestSubj}
      flyoutContentId={flyoutConfig.contentId}
      skipNextEventReport={skipNextEventReport}
    >
      {data.error && <EuiCallOut announceOnMount title={data.error} color="danger" />}
      {flyoutConfig.render({ data, dataView, activeSection })}
    </WaterfallFlyout>
  );
}
