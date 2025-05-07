/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  UnifiedDocViewerLogsOverview,
  type UnifiedDocViewerLogsOverviewApi,
} from '@kbn/unified-doc-viewer-plugin/public';
import { filter, skip } from 'rxjs';
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
            const [logsOverviewApi, setLogsOverviewApi] =
              useState<UnifiedDocViewerLogsOverviewApi | null>(null);
            const initialAccordionSection = useRef(
              context.logOverviewContext$.getValue()?.initialAccordionSection
            );

            useEffect(() => {
              context.logOverviewContext$.next(undefined);

              if (!logsOverviewApi) {
                return;
              }

              if (initialAccordionSection.current) {
                logsOverviewApi.openAndScrollToSection(initialAccordionSection.current);
              }

              initialAccordionSection.current = undefined;

              const subscription = context.logOverviewContext$
                .pipe(
                  skip(1),
                  filter((overviewContext) => {
                    return (
                      overviewContext !== undefined &&
                      overviewContext.initialAccordionSection !== undefined &&
                      overviewContext.recordId === props.hit.id
                    );
                  })
                )
                .subscribe((overviewContext) => {
                  logsOverviewApi.openAndScrollToSection(overviewContext!.initialAccordionSection!);
                  context.logOverviewContext$.next(undefined);
                });

              return () => {
                subscription.unsubscribe();
              };
            }, [logsOverviewApi, props.hit.id]);

            return (
              <UnifiedDocViewerLogsOverview
                {...props}
                ref={setLogsOverviewApi}
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
