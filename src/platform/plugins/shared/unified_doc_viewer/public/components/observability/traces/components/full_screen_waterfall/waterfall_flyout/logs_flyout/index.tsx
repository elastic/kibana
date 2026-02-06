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
import LogsOverview from '../../../../../../doc_viewer_logs_overview';
import { useDataSourcesContext } from '../../../../../../../hooks/use_data_sources';
import { useDocViewerExtensionActionsContext } from '../../../../../../../hooks/use_doc_viewer_extension_actions';
export { useLogFlyoutData } from './use_log_flyout_data';
export type { UseLogFlyoutDataParams, LogFlyoutData } from './use_log_flyout_data';

export const logsFlyoutId = 'logsFlyout' as const;

export interface LogFlyoutContentProps {
  hit: DataTableRecord;
  logDataView: DocViewRenderProps['dataView'];
}

export function LogFlyoutContent({ hit, logDataView }: LogFlyoutContentProps) {
  const { indexes } = useDataSourcesContext();
  const actions = useDocViewerExtensionActionsContext();

  return (
    <LogsOverview
      hit={hit}
      dataView={logDataView}
      indexes={indexes}
      showTraceWaterfall={false}
      docViewActions={actions}
    />
  );
}
