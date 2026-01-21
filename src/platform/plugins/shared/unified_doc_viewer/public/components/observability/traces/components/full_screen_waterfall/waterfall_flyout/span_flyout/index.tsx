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
import type { OverviewApi } from '../../../../doc_viewer_overview/overview';
import { Overview, type TraceOverviewSections } from '../../../../doc_viewer_overview/overview';
import { useDataSourcesContext } from '../../../../../../../hooks/use_data_sources';
import { isSpanHit } from '../../helpers/is_span';
import { useFetchSpan } from '../../hooks/use_fetch_span';

export const spanFlyoutId = 'spanDetailFlyout' as const;

export interface UseSpanFlyoutDataParams {
  spanId: string;
  traceId: string;
}

export interface SpanFlyoutData {
  hit: DataTableRecord | null;
  loading: boolean;
  title: string;
}

export function useSpanFlyoutData({ spanId, traceId }: UseSpanFlyoutDataParams): SpanFlyoutData {
  const { span, loading } = useFetchSpan({ spanId, traceId });

  const hit = useMemo<DataTableRecord | null>(() => {
    if (!span) return null;

    return {
      id: span._id,
      raw: {
        _index: span._index,
        _id: span._id,
        _source: span as unknown as Record<string, unknown>,
      },
      flattened: flattenObject(span),
    };
  }, [span]);

  const isSpan = isSpanHit(hit);

  const title = i18n.translate(
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
  );

  return { hit, loading, title };
}

export interface SpanFlyoutContentProps {
  hit: DataTableRecord;
  dataView: DocViewRenderProps['dataView'];
  activeSection?: TraceOverviewSections;
}

export function SpanFlyoutContent({ hit, dataView, activeSection }: SpanFlyoutContentProps) {
  const { indexes } = useDataSourcesContext();
  const [flyoutRef, setFlyoutRef] = useState<OverviewApi | null>(null);

  useEffect(() => {
    if (activeSection && flyoutRef) {
      flyoutRef.openAndScrollToSection(activeSection);
    }
  }, [activeSection, flyoutRef]);

  return (
    <Overview
      ref={setFlyoutRef}
      hit={hit}
      indexes={indexes}
      showWaterfall={false}
      showActions={false}
      dataView={dataView}
    />
  );
}
