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
import LogsOverview from '../../../../../../doc_viewer_logs_overview';
import { useDataSourcesContext } from '../../../../../../../hooks/use_data_sources';
import { useAdhocDataView } from '../../hooks/use_adhoc_data_view';
import { useFetchLog } from '../../hooks/use_fetch_log';

export const logsFlyoutId = 'logsFlyout' as const;

export interface UseLogFlyoutDataParams {
  id: string;
  index?: string;
}

export interface LogFlyoutData {
  hit: DataTableRecord | null;
  loading: boolean;
  title: string;
  error: string | null;
  logDataView: DocViewRenderProps['dataView'] | null;
}

export function useLogFlyoutData({ id, index }: UseLogFlyoutDataParams): LogFlyoutData {
  const { loading, log, index: resolvedIndex } = useFetchLog({ id, index });
  const {
    dataView: logDataView,
    error,
    loading: loadingDataView,
  } = useAdhocDataView({ index: resolvedIndex ?? null });

  const hit = useMemo<DataTableRecord | null>(() => {
    if (!log || !id || !resolvedIndex) return null;

    return {
      id,
      raw: {
        _index: resolvedIndex,
        _id: id,
        _source: log,
      },
      flattened: flattenObject(log),
    };
  }, [id, log, resolvedIndex]);

  const title = i18n.translate(
    'unifiedDocViewer.observability.traces.fullScreenWaterfall.logFlyout.title.log',
    { defaultMessage: 'Log document' }
  );

  return {
    hit,
    loading: loading || loadingDataView,
    title,
    error,
    logDataView,
  };
}

export interface LogFlyoutContentProps {
  hit: DataTableRecord;
  logDataView: DocViewRenderProps['dataView'];
  error: string | null;
}

export function LogFlyoutContent({ hit, logDataView, error }: LogFlyoutContentProps) {
  const { indexes } = useDataSourcesContext();

  return (
    <>
      {error ? <EuiCallOut announceOnMount title={error} color="danger" /> : null}
      <LogsOverview hit={hit} dataView={logDataView} indexes={indexes} showTraceWaterfall={false} />
    </>
  );
}
