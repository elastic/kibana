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
import { UnifiedDocViewerObservabilityTracesOverview } from '@kbn/unified-doc-viewer-plugin/public';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { ObservabilityIndexes } from '@kbn/discover-utils/src';
import type { DocumentProfileProvider } from '../../../../../profiles';
import type { DocViewerExtensionParams, DocViewerExtension } from '../../../../../types';

export const createGetDocViewer =
  (indexes: ObservabilityIndexes): DocumentProfileProvider['profile']['getDocViewer'] =>
  (prev: (params: DocViewerExtensionParams) => DocViewerExtension) =>
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
            <UnifiedDocViewerObservabilityTracesOverview {...props} indexes={indexes} />
          ),
        });

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };
