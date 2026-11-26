/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  TemplateLoadErrorType,
  TemplatePreviewView,
  TemplateSetupOpenedEvent,
  TemplateTelemetryFields,
} from './events';
import {
  TEMPLATE_LOAD_FAILED_EVENT_TYPE,
  TEMPLATE_PREVIEW_CHANGED_EVENT_TYPE,
  TEMPLATE_SETUP_ABANDONED_EVENT_TYPE,
  TEMPLATE_SETUP_OPENED_EVENT_TYPE,
  TEMPLATE_VIEWED_EVENT_TYPE,
} from './events';

/** Install form details sent when the setup step opens. */
export type TemplateSetupDetails = Pick<
  TemplateSetupOpenedEvent,
  'formFieldCount' | 'connectorTypes' | 'connectorTypesExisting'
>;

/** Reports the Workflow Template library browser events. Never throws. */
export interface LibraryTelemetry {
  reportTemplateViewed(template: TemplateTelemetryFields): void;
  reportTemplateLoadFailed(failure: {
    errorType: TemplateLoadErrorType;
    templateSlug?: string;
  }): void;
  reportTemplatePreviewChanged(
    template: TemplateTelemetryFields,
    previewView: TemplatePreviewView
  ): void;
  reportTemplateSetupOpened(template: TemplateTelemetryFields, setup: TemplateSetupDetails): void;
  reportTemplateSetupAbandoned(template: TemplateTelemetryFields, invalidFields?: string[]): void;
}

// Events are built field by field: the analytics client checks payloads against the
// schema only in development, so nothing else on these objects can reach telemetry.
const toTemplateFields = ({
  templateSlug,
  templateVersion,
  templateOrigin,
  solutions,
}: TemplateTelemetryFields): TemplateTelemetryFields => ({
  templateSlug,
  ...(templateVersion ? { templateVersion } : {}),
  templateOrigin,
  ...(solutions ? { solutions } : {}),
});

export const createLibraryTelemetry = (
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'> | undefined
): LibraryTelemetry => {
  const report = (eventType: string, event: object): void => {
    try {
      analytics?.reportEvent(eventType, event);
    } catch {
      // `reportEvent` throws for an event type no plugin registered. Telemetry must not
      // break the library UI.
    }
  };

  return {
    reportTemplateViewed: (template) =>
      report(TEMPLATE_VIEWED_EVENT_TYPE, toTemplateFields(template)),
    reportTemplateLoadFailed: ({ errorType, templateSlug }) =>
      report(TEMPLATE_LOAD_FAILED_EVENT_TYPE, {
        errorType,
        ...(templateSlug ? { templateSlug } : {}),
      }),
    reportTemplatePreviewChanged: (template, previewView) =>
      report(TEMPLATE_PREVIEW_CHANGED_EVENT_TYPE, { ...toTemplateFields(template), previewView }),
    reportTemplateSetupOpened: (
      template,
      { formFieldCount, connectorTypes, connectorTypesExisting }
    ) =>
      report(TEMPLATE_SETUP_OPENED_EVENT_TYPE, {
        ...toTemplateFields(template),
        formFieldCount,
        ...(connectorTypes ? { connectorTypes } : {}),
        ...(connectorTypesExisting ? { connectorTypesExisting } : {}),
      }),
    reportTemplateSetupAbandoned: (template, invalidFields) =>
      report(TEMPLATE_SETUP_ABANDONED_EVENT_TYPE, {
        ...toTemplateFields(template),
        ...(invalidFields ? { invalidFields } : {}),
      }),
  };
};

/** The library telemetry, reporting through the host's `analytics` service when it has one. */
export const useLibraryTelemetry = (): LibraryTelemetry => {
  const { analytics } = useKibana<{ analytics?: AnalyticsServiceStart }>().services;
  return useMemo(() => createLibraryTelemetry(analytics), [analytics]);
};
