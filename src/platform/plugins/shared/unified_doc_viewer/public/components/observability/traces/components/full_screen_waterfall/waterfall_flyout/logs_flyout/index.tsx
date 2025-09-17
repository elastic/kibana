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
import React, { useMemo } from 'react';
import { WaterfallFlyout } from '..';
import LogsOverview from '../../../../../../doc_viewer_logs_overview';
import { useDataSourcesContext } from '../../../../hooks/use_data_sources';
import { useFetchLog } from '../../hooks/use_fetch_log';

export const logsFlyoutId = 'logsFlyout' as const;

export interface SpanFlyoutProps {
  onCloseFlyout: () => void;
  traceId: string;
  docId: string;
  dataView: DocViewRenderProps['dataView'];
}

export function LogsFlyout({ onCloseFlyout, traceId, docId, dataView }: SpanFlyoutProps) {
  const { loading, logDoc } = useFetchLog({ docId, traceId });
  const { indexes } = useDataSourcesContext();

  const documentAsHit = useMemo<DataTableRecord | null>(() => {
    if (!logDoc || !docId) return null;

    return {
      id: docId,
      raw: {
        _index: logDoc._index,
        _id: docId,
        _source: logDoc,
      },
      flattened: flattenObject(logDoc),
    };
  }, [docId, logDoc]);

  return (
    <WaterfallFlyout
      flyoutId={logsFlyoutId}
      onCloseFlyout={onCloseFlyout}
      dataView={dataView}
      hit={documentAsHit}
      loading={loading}
      title={i18n.translate(
        'unifiedDocViewer.observability.traces.fullScreenWaterfall.logFlyout.title.log',
        { defaultMessage: 'Log' }
      )}
    >
      {documentAsHit ? (
        <LogsOverview
          hit={documentAsHit}
          dataView={dataView}
          indexes={indexes}
          showTraceWaterfall={false}
        />
      ) : null}
    </WaterfallFlyout>
  );
}
