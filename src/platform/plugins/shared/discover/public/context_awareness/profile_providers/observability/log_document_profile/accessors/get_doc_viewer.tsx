/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { UnifiedDocViewerLogsOverview } from '@kbn/unified-doc-viewer-plugin/public';
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
            const [initialAccordionSection, setAccordionSection] =
              useState<LogOverViewAccordionExpandedValue>(
                context.initialLogOverviewAccordionSection$.getValue()
              );

            useEffect(() => {
              const subscription = context.initialLogOverviewAccordionSection$.subscribe(
                (value: 'stacktrace' | 'quality_issues') => {
                  setAccordionSection(value);
                }
              );

              return () => {
                subscription.unsubscribe();
              };
            }, []);

            const accordionState = React.useMemo(() => {
              if (!initialAccordionSection) return {};
              return { [initialAccordionSection]: true };
            }, [initialAccordionSection]);

            return (
              <UnifiedDocViewerLogsOverview
                {...props}
                key={initialAccordionSection} // Force remount when section changes
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
