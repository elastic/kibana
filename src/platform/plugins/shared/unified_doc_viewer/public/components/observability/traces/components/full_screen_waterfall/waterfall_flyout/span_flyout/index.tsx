/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { flattenObject } from '@kbn/object-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useEffect, useMemo, useState } from 'react';
import { WaterfallFlyout } from '..';
import type { OverviewApi } from '../../../../doc_viewer_overview/overview';
import { Overview, type TraceOverviewSections } from '../../../../doc_viewer_overview/overview';
import { useDataSourcesContext } from '../../../../hooks/use_data_sources';
import { isSpanHit } from '../../helpers/is_span';
import { useSpan } from '../../hooks/use_span';

export const spanFlyoutId = 'spanDetailFlyout' as const;

export interface SpanFlyoutProps {
  spanId: string;
  traceId: string;
  dataView: DocViewRenderProps['dataView'];
  onCloseFlyout: () => void;
  activeSection?: TraceOverviewSections;
}

export const SpanFlyout = ({
  spanId,
  traceId,
  dataView,
  onCloseFlyout,
  activeSection,
}: SpanFlyoutProps) => {
  const { span, docId, loading } = useSpan({ spanId, traceId });
  const { indexes } = useDataSourcesContext();
  const [flyoutRef, setFlyoutRef] = useState<OverviewApi | null>(null);

  const documentAsHit = useMemo<DataTableRecord | null>(() => {
    if (!span || !docId) return null;

    return {
      id: docId,
      raw: {
        _index: span._index,
        _id: docId,
        _source: span,
      },
      flattened: flattenObject(span),
    };
  }, [docId, span]);

  const isSpan = isSpanHit(documentAsHit);

  useEffect(() => {
    if (activeSection && flyoutRef) {
      flyoutRef.openAndScrollToSection(activeSection);
    }
  }, [activeSection, flyoutRef]);

  return (
    <WaterfallFlyout
      flyoutId={spanFlyoutId}
      onCloseFlyout={onCloseFlyout}
      dataView={dataView}
      hit={documentAsHit}
      loading={loading}
      title={i18n.translate(
        'unifiedDocViewer.observability.traces.fullScreenWaterfall.spanFlyout.title',
        {
          defaultMessage: '{docType} document',
          values: {
            docType: isSpan
              ? i18n.translate(
                  'unifiedDocViewer.observability.traces.fullScreenWaterfall.spanFlyout.title.span',
                  { defaultMessage: 'Span' }
                )
              : i18n.translate(
                  'unifiedDocViewer.observability.traces.fullScreenWaterfall.spanFlyout.title.transction',
                  { defaultMessage: 'Transaction' }
                ),
          },
        }
      )}
    >
      {documentAsHit ? (
        <Overview
          ref={setFlyoutRef}
          hit={documentAsHit}
          indexes={indexes}
          showWaterfall={false}
          showActions={false}
          dataView={dataView}
        />
      ) : null}
    </WaterfallFlyout>
  );
};
