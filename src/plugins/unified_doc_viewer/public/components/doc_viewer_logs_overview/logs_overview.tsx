/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { useDocDetail } from '../../hooks/use_doc_detail';
import { LogsOverviewHeader } from './logs_overview_header';
import { LogsOverviewHighlights } from './logs_overview_highlights';
import { FieldActionsProvider } from '../../hooks/use_field_actions';

export function LogsOverview({
  columns,
  dataView,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) {
  const parsedDoc = useDocDetail(hit, { dataView });

  return (
    <FieldActionsProvider
      columns={columns}
      filter={filter}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
    >
      <LogsOverviewHeader doc={parsedDoc} />
      <LogsOverviewHighlights formattedDoc={parsedDoc} flattenedDoc={doc.flattened} />
    </FieldActionsProvider>
  );
}
