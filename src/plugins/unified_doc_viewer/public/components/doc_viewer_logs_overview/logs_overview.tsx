/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { useDocDetail } from '../../hooks/use_doc_detail';
import { DiscoverActionsProvider } from '../../hooks/use_discover_action';
import { LogsOverviewHeader } from './logs_overview_header';
import { LogsOverviewHighlights } from './logs_overview_highlights';

export function LogsOverview({
  dataView,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) {
  const parsedDoc = useDocDetail(hit, { dataView });

  const actions = useMemo(
    () => ({ filter, onAddColumn, onRemoveColumn }),
    [filter, onAddColumn, onRemoveColumn]
  );

  return (
    <DiscoverActionsProvider value={actions}>
      <LogsOverviewHeader doc={parsedDoc} />
      <LogsOverviewHighlights formattedDoc={parsedDoc} flattenedDoc={doc.flattened} />
    </DiscoverActionsProvider>
  );
}
