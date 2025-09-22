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
import type { DataView } from '@kbn/data-views-plugin/common';
import { EuiCallOut } from '@elastic/eui';
import { WaterfallFlyout } from '..';
import LogsOverview from '../../../../../../doc_viewer_logs_overview';
import { useDataSourcesContext } from '../../../../hooks/use_data_sources';
import { useFetchLog } from '../../hooks/use_fetch_log';
import { getUnifiedDocViewerServices } from '../../../../../../../plugin';

export const logsFlyoutId = 'logsFlyout' as const;

export interface SpanFlyoutProps {
  onCloseFlyout: () => void;
  errorDocId: string;
  dataView: DocViewRenderProps['dataView'];
}

const errorMessage = i18n.translate(
  'unifiedDocViewer.observability.traces.fullScreenWaterfall.logFlyout.error',
  {
    defaultMessage: 'An error occurred while creating the data view',
  }
);

export function LogsFlyout({ onCloseFlyout, errorDocId, dataView }: SpanFlyoutProps) {
  const { loading, logDoc, index } = useFetchLog({ errorDocId });
  const { indexes } = useDataSourcesContext();
  const [loadingDataView, setLoadingDataView] = useState(false);
  const { dataViews, core } = getUnifiedDocViewerServices();
  const [logDataView, setLogDataView] = useState<DataView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const documentAsHit = useMemo<DataTableRecord | null>(() => {
    if (!logDoc || !errorDocId || !index) return null;

    return {
      id: errorDocId,
      raw: {
        _index: index,
        _id: errorDocId,
        _source: logDoc,
      },
      flattened: flattenObject(logDoc),
    };
  }, [errorDocId, logDoc, index]);

  useEffect(() => {
    async function createAdhocDataView() {
      if (!index) {
        return;
      }
      setLoadingDataView(true);
      setError(null);
      try {
        const _dataView = await dataViews.create(
          { title: index, timeFieldName: '@timestamp' },
          undefined,
          false
        );
        setLogDataView(_dataView);
      } catch (e) {
        setError(errorMessage);
        const err = e as Error;
        core.notifications.toasts.addDanger({
          title: errorMessage,
          text: err.message,
        });
      } finally {
        setLoadingDataView(false);
      }
    }
    createAdhocDataView();
  }, [index, dataViews, core.notifications.toasts]);

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
