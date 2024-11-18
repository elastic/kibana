/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { UnifiedDocViewerLogsOverview } from '@kbn/unified-doc-viewer-plugin/public';
import React from 'react';
import type { DocumentProfileProvider } from '../../../../profiles';

export const getDocViewer: DocumentProfileProvider['profile']['getDocViewer'] =
  (prev) => (params) => {
    const prevDocViewer = prev(params);

    return {
      ...prevDocViewer,
      docViewsRegistry: (registry) => {
        registry.add({
          id: 'doc_view_logs_overview',
          title: i18n.translate('discover.docViews.logsOverview.title', {
            defaultMessage: 'Log overview',
          }),
          order: 0,
          component: (props) => <UnifiedDocViewerLogsOverview {...props} />,
        });

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };
