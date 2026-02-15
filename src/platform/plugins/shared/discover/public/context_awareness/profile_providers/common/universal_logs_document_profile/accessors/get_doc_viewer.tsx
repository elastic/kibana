/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ObservabilityLogsAIAssistantFeature,
  ObservabilityLogsAIInsightFeature,
  ObservabilityStreamsFeature,
} from '@kbn/discover-shared-plugin/public';
import type { ObservabilityIndexes } from '@kbn/discover-utils/src';
import { i18n } from '@kbn/i18n';
import {
  UnifiedDocViewerLogsOverview,
} from '@kbn/unified-doc-viewer-plugin/public';
import type { DocViewRenderProps, DocViewActions } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import type { DocumentProfileProvider } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';

/**
 * Creates doc viewer with capability-based feature detection
 * Shows "Logs overview" tab with smart feature detection:
 * - Only shows Streams links if Streams feature exists
 * - Only shows APM links if APM is available
 * - Only shows AI features if available
 */
export const createGetDocViewer =
  (services: ProfileProviderServices): DocumentProfileProvider['profile']['getDocViewer'] =>
  (prev) =>
  (params) => {
    const prevDocViewer = prev(params);

    // Check for available features (gracefully handle missing services)
    let logsAIAssistantFeature: ObservabilityLogsAIAssistantFeature | undefined;
    let logsAIInsightFeature: ObservabilityLogsAIInsightFeature | undefined;
    let streamsFeature: ObservabilityStreamsFeature | undefined;

    try {
      logsAIAssistantFeature = services.discoverShared?.features?.registry?.getById(
        'observability-logs-ai-assistant'
      ) as ObservabilityLogsAIAssistantFeature | undefined;
    } catch (e) {
      // Feature not available
    }

    try {
      logsAIInsightFeature = services.discoverShared?.features?.registry?.getById(
        'observability-logs-ai-insight'
      ) as ObservabilityLogsAIInsightFeature | undefined;
    } catch (e) {
      // Feature not available
    }

    try {
      streamsFeature = services.discoverShared?.features?.registry?.getById(
        'streams'
      ) as ObservabilityStreamsFeature | undefined;
    } catch (e) {
      // Feature not available
    }

    // Build indexes object with safety checks
    const indexes: ObservabilityIndexes = {
      apm: {
        errors: services.apmContextService?.errorsService?.getErrorsIndexPattern?.() || undefined,
        traces: services.apmContextService?.tracesService?.getAllTracesIndexPattern?.() || undefined,
      },
      logs: services.logsContextService?.getAllLogsIndexPattern?.() || undefined,
    };

    return {
      ...prevDocViewer,
      docViewsRegistry: (registry) => {
        // Add logs overview tab
        registry.add({
          id: 'doc_view_logs_overview',
          title: i18n.translate('discover.universalLogsProfile.docViewer.logsOverviewTitle', {
            defaultMessage: 'Log overview',
          }),
          order: 0,
          render: (props: DocViewRenderProps) => {
            return (
              <UnifiedDocViewerLogsOverview
                {...props}
                docViewActions={params.actions}
                // Pass features - UnifiedDocViewerLogsOverview handles undefined gracefully
                renderAIAssistant={logsAIAssistantFeature?.render}
                renderAIInsight={logsAIInsightFeature?.render}
                renderFlyoutStreamField={streamsFeature?.renderFlyoutStreamField}
                renderFlyoutStreamProcessingLink={streamsFeature?.renderFlyoutStreamProcessingLink}
                indexes={indexes}
              />
            );
          },
        });

        // Apply previous doc viewer registry modifications
        return prevDocViewer.docViewsRegistry
          ? prevDocViewer.docViewsRegistry(registry)
          : registry;
      },
    };
  };
