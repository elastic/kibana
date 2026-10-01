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
import type { DataTableRecord } from '@kbn/discover-utils';
import { fieldConstants, getMessageFieldWithFallbacks } from '@kbn/discover-utils';
import type { LogDocument, ObservabilityIndexes } from '@kbn/discover-utils/src';
import { getFieldValueWithFallback, getStacktraceFields } from '@kbn/discover-utils/src';
import { PROJECT_ROUTING, type ICPSManager } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';
import {
  UnifiedDocViewerLogsOverview,
  type UnifiedDocViewerLogsOverviewApi,
} from '@kbn/unified-doc-viewer-plugin/public';
import type { DocViewRenderProps, DocViewActions } from '@kbn/unified-doc-viewer/types';
import { useObservable } from '@kbn/use-observable';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BehaviorSubject } from 'rxjs';
import { EMPTY, filter, map, skip } from 'rxjs';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import type { LogOverviewContext } from '../../logs_data_source_profile/profile';
import { OBSERVABILITY_LOG_DOCUMENT_PROFILE_ID, type LogDocumentProfileProvider } from '../profile';

/**
 * Whether the Log overview tab has anything to show for the record. Mirrors what the overview
 * sections and the row leading controls look at, so every control that requests this tab finds
 * the section it asked for.
 */
const hasLogOverviewContent = (record: DataTableRecord) => {
  const { flattened, raw } = record;

  const hasMessage = Boolean(getMessageFieldWithFallbacks(flattened).value);
  const hasStacktrace = Object.values(getStacktraceFields(record as LogDocument)).some(Boolean);
  const hasQualityIssues = fieldConstants.DEGRADED_DOCS_FIELDS.some((field) => raw[field] != null);
  const hasTrace = Boolean(
    getFieldValueWithFallback(flattened, fieldConstants.TRACE_ID_FIELD).value
  );

  return hasMessage || hasStacktrace || hasQualityIssues || hasTrace;
};

export const createGetDocViewer =
  (services: ProfileProviderServices): LogDocumentProfileProvider['profile']['getDocViewer'] =>
  (prev, { context, toolkit }) =>
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
          enabled: hasLogOverviewContent(params.record),
          render: (props: DocViewRenderProps) => (
            <LogOverviewTab
              logOverviewContext$={context.logOverviewContext$}
              logsAIAssistantFeature={logsAIAssistantFeature}
              logsAIInsightFeature={logsAIInsightFeature}
              streamsFeature={streamsFeature}
              cpsManager={services.cps?.cpsManager}
              indexes={indexes}
              docViewActions={toolkit.actions}
              {...props}
            />
          ),
        });

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };

interface LogOverviewTabProps extends DocViewRenderProps {
  logOverviewContext$: BehaviorSubject<LogOverviewContext | undefined>;
  logsAIAssistantFeature: ObservabilityLogsAIAssistantFeature | undefined;
  logsAIInsightFeature: ObservabilityLogsAIInsightFeature | undefined;
  streamsFeature: ObservabilityStreamsFeature | undefined;
  cpsManager?: ICPSManager;
  indexes: ObservabilityIndexes;
  docViewActions?: DocViewActions;
}

const LogOverviewTab = ({
  logOverviewContext$,
  logsAIAssistantFeature,
  logsAIInsightFeature,
  streamsFeature,
  cpsManager,
  indexes,
  docViewActions,
  ...props
}: LogOverviewTabProps) => {
  const [logsOverviewApi, setLogsOverviewApi] = useState<UnifiedDocViewerLogsOverviewApi | null>(
    null
  );
  useAccordionExpansionEffect(logOverviewContext$, logsOverviewApi, props.hit.id);

  const cpsHasLinkedProjects$ = useMemo(
    () =>
      cpsManager
        ? cpsManager.getProjectRouting$().pipe(map((r) => r !== PROJECT_ROUTING.ORIGIN))
        : EMPTY,
    [cpsManager]
  );
  const isNotOriginRouting = useObservable(cpsHasLinkedProjects$, false);
  const cpsHasLinkedProjects = (cpsManager?.getTotalProjectCount() ?? 0) > 1 && isNotOriginRouting;

  return (
    <UnifiedDocViewerLogsOverview
      {...props}
      docViewActions={docViewActions}
      ref={setLogsOverviewApi}
      renderAIAssistant={logsAIAssistantFeature?.render}
      renderAIInsight={logsAIInsightFeature?.render}
      renderFlyoutStreamField={streamsFeature?.renderFlyoutStreamField}
      renderFlyoutStreamProcessingLink={streamsFeature?.renderFlyoutStreamProcessingLink}
      cpsHasLinkedProjects={cpsHasLinkedProjects}
      indexes={indexes}
      profileId={OBSERVABILITY_LOG_DOCUMENT_PROFILE_ID}
    />
  );
};

const useAccordionExpansionEffect = (
  logOverviewContext$: BehaviorSubject<LogOverviewContext | undefined>,
  logsOverviewApi: UnifiedDocViewerLogsOverviewApi | null,
  recordId: string
) => {
  const initialContext = logOverviewContext$.getValue();
  const initialAccordionSection = useRef(
    initialContext?.recordId === recordId ? initialContext.initialAccordionSection : undefined
  );

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
