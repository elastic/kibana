/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { getLogDocumentOverview } from '@kbn/discover-utils';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { ObservabilityLogsAIAssistantFeatureRenderDeps } from '@kbn/discover-shared-plugin/public';
import { getStacktraceFields, LogDocument } from '@kbn/discover-utils/src';
import { StreamsFeatureRenderDeps } from '@kbn/discover-shared-plugin/public/services/discover_features';
import { LogsOverviewHeader } from './logs_overview_header';
import { LogsOverviewHighlights } from './logs_overview_highlights';
import { FieldActionsProvider } from '../../hooks/use_field_actions';
import { getUnifiedDocViewerServices } from '../../plugin';
import { LogsOverviewDegradedFields } from './logs_overview_degraded_fields';
import { LogsOverviewStacktraceSection } from './logs_overview_stacktrace_section';

export type LogsOverviewProps = DocViewRenderProps & {
  renderAIAssistant?: (deps: ObservabilityLogsAIAssistantFeatureRenderDeps) => JSX.Element;
  renderStreamsField?: (deps: StreamsFeatureRenderDeps) => JSX.Element;
};

export function LogsOverview({
  columns,
  dataView,
  hit,
  filter,
  onAddColumn,
  onRemoveColumn,
  renderAIAssistant,
  renderStreamsField,
}: LogsOverviewProps) {
  const { fieldFormats } = getUnifiedDocViewerServices();
  const parsedDoc = getLogDocumentOverview(hit, { dataView, fieldFormats });
  const LogsOverviewAIAssistant = renderAIAssistant;
  const stacktraceFields = getStacktraceFields(hit as LogDocument);
  const isStacktraceAvailable = Object.values(stacktraceFields).some(Boolean);

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
      <LogsOverviewHighlights
        formattedDoc={parsedDoc}
        doc={hit}
        renderStreamsField={renderStreamsField}
      />
      <LogsOverviewDegradedFields rawDoc={hit.raw} />
      {isStacktraceAvailable && <LogsOverviewStacktraceSection hit={hit} dataView={dataView} />}
      {LogsOverviewAIAssistant && <LogsOverviewAIAssistant doc={hit} />}
    </FieldActionsProvider>
  );
}
