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
import { UnifiedDocViewerLogsOverview } from '@kbn/unified-doc-viewer-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import type { LogDocumentProfileProvider } from '../profile';
import type { LogOverViewAccordionExpandedValue } from '../../logs_data_source_profile/profile';

export const createGetDocViewer =
  (services: ProfileProviderServices): LogDocumentProfileProvider['profile']['getDocViewer'] =>
  (prev, { context }) =>
  (params) => {
    const prevDocViewer = prev(params);

    const logsAIAssistantFeature = services.discoverShared.features.registry.getById(
      'observability-logs-ai-assistant'
    );

    const streamsFeature = services.discoverShared.features.registry.getById('streams');

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
            const initialAccordionSection = useObservable<LogOverViewAccordionExpandedValue>(
              context.initialLogOverviewAccordionSection$,
              context.initialLogOverviewAccordionSection$.getValue()
            );

            const accordionState = React.useMemo(() => {
              if (!initialAccordionSection) return {};
              return { [initialAccordionSection]: true };
            }, [initialAccordionSection]);

            return (
              <UnifiedDocViewerLogsOverview
                {...props}
                key={initialAccordionSection} // Force remount to handle use case where user clicks on stacktrace and then degraded docs on the same row when the flyout os already open
                docViewerAccordionState={accordionState}
                renderAIAssistant={logsAIAssistantFeature?.render}
                renderStreamsField={streamsFeature?.renderStreamsField}
              />
            );
          },
        });

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };
