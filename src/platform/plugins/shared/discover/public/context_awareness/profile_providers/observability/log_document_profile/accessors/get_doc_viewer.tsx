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
import type { ObservabilityIndexes } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import {
  UnifiedDocViewerLogsOverview,
  UnifiedDocViewerServicesProvider,
  type UnifiedDocViewerContextualServices,
  type UnifiedDocViewerLogsOverviewApi,
} from '@kbn/discover-contextual-components';
import type { DocViewRenderProps, DocViewActions } from '@kbn/unified-doc-viewer/types';
import React, { useEffect, useRef, useState } from 'react';
import type { BehaviorSubject } from 'rxjs';
import { filter, skip } from 'rxjs';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import type { LogOverviewContext } from '../../logs_data_source_profile/profile';
import type { LogDocumentProfileProvider } from '../profile';

const getUnifiedDocViewerContextualServices = (
  services: ProfileProviderServices
): UnifiedDocViewerContextualServices => ({
  analytics: services.analytics,
  data: services.data,
  fieldFormats: services.fieldFormats,
  fieldsMetadata: services.fieldsMetadata,
  toasts: services.core.notifications.toasts,
  storage: services.storage,
  uiSettings: services.uiSettings,
  share: services.share,
  core: services.core,
  discoverShared: services.discoverShared,
});

export const createGetDocViewer =
  (services: ProfileProviderServices): LogDocumentProfileProvider['profile']['getDocViewer'] =>
  (prev, { context }) =>
  (params) => {
    const prevDocViewer = prev(params);

    const logsAIAssistantFeature = services.discoverShared.features.registry.getById(
      'observability-logs-ai-assistant'
    );

    const logsAIInsightFeature = services.discoverShared.features.registry.getById(
      'observability-logs-ai-insight'
    );

    const streamsFeature = services.discoverShared.features.registry.getById('streams');

    const indexes = {
      apm: {
        errors: services.apmContextService.errorsService.getErrorsIndexPattern(),
        traces: services.apmContextService.tracesService.getAllTracesIndexPattern(),
      },
      logs: services.logsContextService.getAllLogsIndexPattern(),
    };

    return {
      ...prevDocViewer,
      docViewsRegistry: (registry) => {
        registry.add({
          id: 'doc_view_logs_overview',
          title: i18n.translate('discover.docViews.logsOverview.title', {
            defaultMessage: 'Log overview',
          }),
          order: 0,
          render: (props: DocViewRenderProps) => {
            return (
              <LogOverviewTab
                services={services}
                logOverviewContext$={context.logOverviewContext$}
                logsAIAssistantFeature={logsAIAssistantFeature}
                logsAIInsightFeature={logsAIInsightFeature}
                streamsFeature={streamsFeature}
                indexes={indexes}
                docViewActions={params.actions}
                {...props}
              />
            );
          },
        });

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };

interface LogOverviewTabProps extends DocViewRenderProps {
  services: ProfileProviderServices;
  logOverviewContext$: BehaviorSubject<LogOverviewContext | undefined>;
  logsAIAssistantFeature: ObservabilityLogsAIAssistantFeature | undefined;
  logsAIInsightFeature: ObservabilityLogsAIInsightFeature | undefined;
  streamsFeature: ObservabilityStreamsFeature | undefined;
  indexes: ObservabilityIndexes;
  docViewActions?: DocViewActions;
}

const LogOverviewTab = ({
  services,
  logOverviewContext$,
  logsAIAssistantFeature,
  logsAIInsightFeature,
  streamsFeature,
  indexes,
  docViewActions,
  ...props
}: LogOverviewTabProps) => {
  const [logsOverviewApi, setLogsOverviewApi] = useState<UnifiedDocViewerLogsOverviewApi | null>(
    null
  );
  useAccordionExpansionEffect(logOverviewContext$, logsOverviewApi, props.hit.id);

  return (
    <UnifiedDocViewerServicesProvider services={getUnifiedDocViewerContextualServices(services)}>
      <UnifiedDocViewerLogsOverview
        {...props}
        docViewActions={docViewActions}
        ref={setLogsOverviewApi}
        renderAIAssistant={logsAIAssistantFeature?.render}
        renderAIInsight={logsAIInsightFeature?.render}
        renderFlyoutStreamField={streamsFeature?.renderFlyoutStreamField}
        renderFlyoutStreamProcessingLink={streamsFeature?.renderFlyoutStreamProcessingLink}
        indexes={indexes}
      />
    </UnifiedDocViewerServicesProvider>
  );
};

const useAccordionExpansionEffect = (
  logOverviewContext$: BehaviorSubject<LogOverviewContext | undefined>,
  logsOverviewApi: UnifiedDocViewerLogsOverviewApi | null,
  recordId: string
) => {
  const initialAccordionSection = useRef(logOverviewContext$.getValue()?.initialAccordionSection);

  useEffect(() => {
    if (!logsOverviewApi) {
      return;
    }

    logOverviewContext$.next(undefined);

    if (initialAccordionSection.current) {
      logsOverviewApi.openAndScrollToSection(initialAccordionSection.current);
    }

    initialAccordionSection.current = undefined;

    const subscription = logOverviewContext$
      .pipe(
        skip(1),
        filter((overviewContext) => {
          return (
            overviewContext !== undefined &&
            overviewContext.initialAccordionSection !== undefined &&
            overviewContext.recordId === recordId
          );
        })
      )
      .subscribe((overviewContext) => {
        logsOverviewApi.openAndScrollToSection(overviewContext!.initialAccordionSection!);
        logOverviewContext$.next(undefined);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [logOverviewContext$, logsOverviewApi, recordId]);
};
