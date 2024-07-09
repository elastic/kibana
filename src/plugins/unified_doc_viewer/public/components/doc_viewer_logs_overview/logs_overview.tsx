/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { getLogDocumentOverview } from '@kbn/discover-utils';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { LogsOverviewHeader } from './logs_overview_header';
import { LogsOverviewHighlights } from './logs_overview_highlights';
import { FieldActionsProvider } from '../../hooks/use_field_actions';
import { getUnifiedDocViewerServices } from '../../plugin';
import { LogsOverviewAIAssistant } from './logs_overview_ai_assistant';
import { LogsOverviewDegradedFields } from './logs_overview_degraded_fields';

export function LogsOverview({
  columns,
  dataView,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) {
  const { fieldFormats } = getUnifiedDocViewerServices();
  const parsedDoc = getLogDocumentOverview(hit, { dataView, fieldFormats });

  return (
    <FieldActionsProvider
      columns={columns}
      filter={filter}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
    >
      <EuiSpacer size="m" />
      <LogsOverviewHeader doc={parsedDoc} />
      <EuiHorizontalRule margin="xs" />
      <LogsOverviewHighlights formattedDoc={parsedDoc} flattenedDoc={hit.flattened} />
      <LogsOverviewDegradedFields rawDoc={hit.raw} />
      <LogsOverviewAIAssistant doc={hit} />
    </FieldActionsProvider>
  );
}
