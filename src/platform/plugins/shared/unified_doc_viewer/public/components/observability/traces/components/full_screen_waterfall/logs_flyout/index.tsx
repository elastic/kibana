/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSkeletonTitle,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { flattenObject } from '@kbn/object-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { useFetchLog } from '../hooks/use_fetch_log';
import LogsOverview from '../../../../../doc_viewer_logs_overview';
import { useDataSourcesContext } from '../../../hooks/use_data_sources';

export interface SpanFlyoutProps {
  onCloseFlyout: () => void;
  traceId: string;
  docId: string;
  dataView: DocViewRenderProps['dataView'];
}

export function LogsFlyout({ onCloseFlyout, traceId, docId, dataView }: SpanFlyoutProps) {
  const { euiTheme } = useEuiTheme();
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
    <EuiFlyout
      includeFixedHeadersInFocusTrap={false}
      ownFocus={false}
      css={{ zIndex: (euiTheme.levels.mask as number) + 1, top: '0' }}
      onClose={onCloseFlyout}
      aria-labelledby="logsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiSkeletonTitle isLoading={loading}>
          <EuiTitle size="m">
            <h2>Log overview</h2>
          </EuiTitle>
        </EuiSkeletonTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {documentAsHit && (
          <LogsOverview
            hit={documentAsHit}
            dataView={dataView}
            indexes={indexes}
            showTraceWaterfall={false}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
