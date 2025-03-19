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
import React, { useEffect, useState } from 'react';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import type { LogDocumentProfileProvider } from '../profile';

export const createGetDocViewer =
  (services: ProfileProviderServices): LogDocumentProfileProvider['profile']['getDocViewer'] =>
  (prev, { context }) =>
  (params) => {
    const prevDocViewer = prev(params);

    const logsAIAssistantFeature = services.discoverShared.features.registry.getById(
      'observability-logs-ai-assistant'
    );

    return {
      ...prevDocViewer,
      docViewsRegistry: (registry) => {
        registry.add({
          id: 'doc_view_logs_overview',
          title: i18n.translate('discover.docViews.logsOverview.title', {
            defaultMessage: 'Log overview',
          }),
          order: 0,
          component: function LogOverviewTab(props) {
            const [initialAccordionSection] = useState(() =>
              context.initialLogOverviewAccordionSection$.getValue()
            );

            useEffect(() => {
              context.initialLogOverviewAccordionSection$.next(undefined);
            }, []);

            return (
              <UnifiedDocViewerLogsOverview
                {...props}
                docViewerAccordionState={
                  initialAccordionSection ? { [initialAccordionSection]: true } : {}
                }
                renderAIAssistant={logsAIAssistantFeature?.render}
              />
            );
          },
        });

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };
