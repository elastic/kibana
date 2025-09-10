/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import {
  SERVICE_NAME_FIELD,
  SPAN_ID_FIELD,
  TRACE_ID_FIELD,
  TRANSACTION_ID_FIELD,
  getLogDocumentOverview,
} from '@kbn/discover-utils';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import type {
  ObservabilityLogsAIAssistantFeature,
  ObservabilityStreamsFeature,
} from '@kbn/discover-shared-plugin/public';
import type { LogDocument, TraceIndexes } from '@kbn/discover-utils/src';
import { getStacktraceFields } from '@kbn/discover-utils/src';
import { css } from '@emotion/react';
import { LogsOverviewHeader } from './logs_overview_header';
import { LogsOverviewHighlights } from './logs_overview_highlights';
import { FieldActionsProvider } from '../../hooks/use_field_actions';
import { getUnifiedDocViewerServices } from '../../plugin';
import { LogsOverviewDegradedFields } from './logs_overview_degraded_fields';
import { LogsOverviewStacktraceSection } from './logs_overview_stacktrace_section';
import type { ScrollableSectionWrapperApi } from './scrollable_section_wrapper';
import {
  DEFAULT_MARGIN_BOTTOM,
  getTabContentAvailableHeight,
} from '../doc_viewer_source/get_height';
import { TraceWaterfall } from '../observability/traces/components/trace_waterfall';
import { DataSourcesProvider } from '../observability/traces/hooks/use_data_sources';

export type LogsOverviewProps = DocViewRenderProps & {
  renderAIAssistant?: ObservabilityLogsAIAssistantFeature['render'];
  renderFlyoutStreamField?: ObservabilityStreamsFeature['renderFlyoutStreamField'];
  renderFlyoutStreamProcessingLink?: ObservabilityStreamsFeature['renderFlyoutStreamProcessingLink'];
  indexes: TraceIndexes;
};

export interface LogsOverviewApi {
  openAndScrollToSection: (section: 'stacktrace' | 'quality_issues') => void;
}

export const LogsOverview = forwardRef<LogsOverviewApi, LogsOverviewProps>(
  (
    {
      columns,
      dataView,
      hit,
      decreaseAvailableHeightBy = DEFAULT_MARGIN_BOTTOM,
      filter,
      onAddColumn,
      onRemoveColumn,
      renderAIAssistant,
      renderFlyoutStreamField,
      renderFlyoutStreamProcessingLink,
      indexes,
    },
    ref
  ) => {
    const { fieldFormats } = getUnifiedDocViewerServices();
    const parsedDoc = getLogDocumentOverview(hit, { dataView, fieldFormats });
    const LogsOverviewAIAssistant = renderAIAssistant;
    const stacktraceFields = getStacktraceFields(hit as LogDocument);
    const isStacktraceAvailable = Object.values(stacktraceFields).some(Boolean);
    const qualityIssuesSectionRef = useRef<ScrollableSectionWrapperApi>(null);
    const stackTraceSectionRef = useRef<ScrollableSectionWrapperApi>(null);
    const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

    const containerHeight = containerRef
      ? getTabContentAvailableHeight(containerRef, decreaseAvailableHeightBy)
      : 0;

    useImperativeHandle(
      ref,
      () => ({
        openAndScrollToSection: (section) => {
          if (section === 'quality_issues') {
            qualityIssuesSectionRef.current?.openAndScrollToSection();
          } else if (section === 'stacktrace') {
            stackTraceSectionRef.current?.openAndScrollToSection();
          }
        },
      }),
      []
    );

    return (
      <DataSourcesProvider indexes={indexes}>
        <FieldActionsProvider
          columns={columns}
          filter={filter}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
        >
          <div
            ref={setContainerRef}
            css={
              containerHeight
                ? css`
                    height: ${containerHeight}px;
                    overflow: auto;
                  `
                : undefined
            }
          >
            <EuiSpacer size="m" />
            <LogsOverviewHeader
              formattedDoc={parsedDoc}
              doc={hit}
              renderFlyoutStreamProcessingLink={renderFlyoutStreamProcessingLink}
            />
            <EuiHorizontalRule margin="xs" />
            <LogsOverviewHighlights
              formattedDoc={parsedDoc}
              doc={hit}
              renderFlyoutStreamField={renderFlyoutStreamField}
            />
            <LogsOverviewDegradedFields ref={qualityIssuesSectionRef} rawDoc={hit.raw} />
            {isStacktraceAvailable && (
              <LogsOverviewStacktraceSection
                ref={stackTraceSectionRef}
                hit={hit}
                dataView={dataView}
              />
            )}
            {parsedDoc[TRACE_ID_FIELD] ? (
              <TraceWaterfall
                traceId={parsedDoc[TRACE_ID_FIELD]}
                docId={parsedDoc[TRANSACTION_ID_FIELD] || parsedDoc[SPAN_ID_FIELD]}
                serviceName={parsedDoc[SERVICE_NAME_FIELD]}
                dataView={dataView}
              />
            ) : null}
            {LogsOverviewAIAssistant && <LogsOverviewAIAssistant doc={hit} />}
          </div>
        </FieldActionsProvider>
      </DataSourcesProvider>
    );
  }
);
