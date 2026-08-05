/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  GenAiTechnicalPreviewBadge,
  GENAI_EBT_CLICK_ACTIONS,
  hasGenAiData,
} from '@kbn/apm-ui-shared';
import {
  TRACES_DOC_VIEWER_EBT_ELEMENTS,
  UnifiedDocViewerObservabilityTracesGenAi,
  UnifiedDocViewerObservabilityTracesOverview,
} from '@kbn/unified-doc-viewer-plugin/public';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { ObservabilityIndexes } from '@kbn/discover-utils/src';
import type { DocumentProfileProvider } from '../../../../../profiles';
import type { DocViewerExtensionParams } from '../../../../../types';

export const createGetDocViewer =
  (
    indexes: ObservabilityIndexes,
    profileId: string
  ): DocumentProfileProvider['profile']['getDocViewer'] =>
  (prev, { toolkit }) =>
  (params: DocViewerExtensionParams) => {
    const prevDocViewer = prev(params);
    const tabTitle = i18n.translate('discover.docViews.observability.traces.overview.title', {
      defaultMessage: 'Overview',
    });
    return {
      ...prevDocViewer,
      docViewsRegistry: (registry: DocViewsRegistry) => {
        registry.add({
          id: 'doc_view_obs_traces_overview',
          title: tabTitle,
          order: 0,
          render: (props) => (
            <UnifiedDocViewerObservabilityTracesOverview
              {...props}
              indexes={indexes}
              profileId={profileId}
              docViewActions={toolkit.actions}
            />
          ),
        });

        if (hasGenAiData(params.record.flattened)) {
          registry.add({
            id: 'doc_view_obs_traces_genai',
            title: i18n.translate('discover.docViews.observability.traces.genAi.title', {
              defaultMessage: 'GenAI',
            }),
            order: 5,
            prepend: <GenAiTechnicalPreviewBadge />,
            ebt: {
              action: GENAI_EBT_CLICK_ACTIONS.VIEW_GENAI,
              element: TRACES_DOC_VIEWER_EBT_ELEMENTS.TABS,
            },
            render: (props) => <UnifiedDocViewerObservabilityTracesGenAi {...props} />,
          });
        }

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };
