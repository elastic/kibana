/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { getLogDocumentOverview } from '@kbn/discover-utils';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import type {
  ObservabilityLogsAIAssistantFeature,
  ObservabilityStreamsFeature,
} from '@kbn/discover-shared-plugin/public';
import type { LogDocument } from '@kbn/discover-utils/src';
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

export type LogsOverviewProps = DocViewRenderProps & {
  renderAIAssistant?: ObservabilityLogsAIAssistantFeature['render'];
  renderFlyoutStreamField?: ObservabilityStreamsFeature['renderFlyoutStreamField'];
  renderFlyoutStreamProcessingLink?: ObservabilityStreamsFeature['renderFlyoutStreamProcessingLink'];
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
    const containerRef = useRef<HTMLDivElement>(null);

    const containerHeight = containerRef.current
      ? getTabContentAvailableHeight(containerRef.current, decreaseAvailableHeightBy)
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
      <FieldActionsProvider
        columns={columns}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      >
        <div
          ref={containerRef}
          css={
            containerHeight
              ? css`
                  height: ${containerHeight}px;
                  overflow: auto;
                `
              : css`
                  display: block;
                `
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
          {LogsOverviewAIAssistant && <LogsOverviewAIAssistant doc={hit} />}
        </div>
      </FieldActionsProvider>
    );
  }
);
