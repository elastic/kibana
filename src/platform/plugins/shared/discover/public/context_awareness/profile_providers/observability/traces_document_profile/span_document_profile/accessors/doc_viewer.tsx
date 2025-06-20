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
import { UnifiedDocViewerObservabilityTracesSpanOverview } from '@kbn/unified-doc-viewer-plugin/public';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { DocumentProfileProvider } from '../../../../../profiles';
import type { DocViewerExtensionParams, DocViewerExtension } from '../../../../../types';

export const createGetDocViewer =
  (indexes: {
    apm: { errors: string; traces: string };
    logs: string;
  }): DocumentProfileProvider['profile']['getDocViewer'] =>
  (prev: (params: DocViewerExtensionParams) => DocViewerExtension) =>
  (params: DocViewerExtensionParams) => {
    const prevDocViewer = prev(params);

    return {
      ...prevDocViewer,
      docViewsRegistry: (registry: DocViewsRegistry) => {
        registry.add({
          id: 'doc_view_obs_traces_span_overview',
          title: i18n.translate('discover.docViews.observability.traces.spanOverview.title', {
            defaultMessage: 'Span overview',
          }),
          order: 0,
          component: (props) => {
            return <UnifiedDocViewerObservabilityTracesSpanOverview {...props} indexes={indexes} />;
          },
        });

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };
