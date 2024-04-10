/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { getDocumentOverview } from '@kbn/discover-utils';
import { EuiSpacer } from '@elastic/eui';
import { LogsOverviewHeader } from './logs_overview_header';
import { LogsOverviewHighlights } from './logs_overview_highlights';
import { FieldActionsProvider } from '../../hooks/use_field_actions';
import { getUnifiedDocViewerServices } from '../../plugin';
import { LogsOverviewAIAssistant } from './logs_overview_ai_assistant';

export function LogsOverview({
  columns,
  dataView,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) {
  const { fieldFormats } = getUnifiedDocViewerServices();
  const parsedDoc = getDocumentOverview(hit, { dataView, fieldFormats });

  return (
    <FieldActionsProvider
      columns={columns}
      filter={filter}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
    >
      <EuiSpacer size="m" />
      <LogsOverviewHeader doc={parsedDoc} />
      <LogsOverviewHighlights formattedDoc={parsedDoc} flattenedDoc={hit.flattened} />
      <LogsOverviewAIAssistant doc={hit} />
    </FieldActionsProvider>
  );
}
