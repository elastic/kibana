/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { flattenObject } from '@kbn/object-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo } from 'react';
import { WaterfallFlyout } from '..';
import LogsOverview from '../../../../../../doc_viewer_logs_overview';
import { useDataSourcesContext } from '../../../../hooks/use_data_sources';
import { useAdhocDataView } from '../../hooks/use_adhoc_data_view';
import { useFetchLog } from '../../hooks/use_fetch_log';

export const logsFlyoutId = 'logsFlyout' as const;

export interface SpanFlyoutProps {
  onCloseFlyout: () => void;
  id: string;
  dataView: DocViewRenderProps['dataView'];
}

export function LogsFlyout({ onCloseFlyout, id, dataView }: SpanFlyoutProps) {
  const { loading, logDoc, index } = useFetchLog({ id });
  const { indexes } = useDataSourcesContext();
  const { dataView: logDataView, error, loading: loadingDataView } = useAdhocDataView({ index });

  const documentAsHit = useMemo<DataTableRecord | null>(() => {
    if (!logDoc || !id || !index) return null;

    return {
      id,
      raw: {
        _index: index,
        _id: id,
        _source: logDoc,
      },
      flattened: flattenObject(logDoc),
    };
  }, [id, logDoc, index]);

  return (
    <WaterfallFlyout
      flyoutId={logsFlyoutId}
      onCloseFlyout={onCloseFlyout}
      dataView={dataView}
      hit={documentAsHit}
      loading={loading || loadingDataView}
      title={i18n.translate(
        'unifiedDocViewer.observability.traces.fullScreenWaterfall.logFlyout.title.log',
        { defaultMessage: 'Log document' }
      )}
    >
      {error ? <EuiCallOut announceOnMount title={error} color="danger" /> : null}
      {documentAsHit && logDataView ? (
        <LogsOverview
          hit={documentAsHit}
          dataView={logDataView}
          indexes={indexes}
          showTraceWaterfall={false}
        />
      ) : null}
    </WaterfallFlyout>
  );
}
