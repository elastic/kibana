/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyticsServiceMock } from '@kbn/core/public/mocks';
import type { TemplateTelemetryFields } from './events';
import { createLibraryTelemetry } from './use_library_telemetry';

const TEMPLATE: TemplateTelemetryFields = {
  templateSlug: 'triage-alerts',
  templateVersion: '1.2.0',
  templateOrigin: 'catalog',
  solutions: ['security'],
};

describe('createLibraryTelemetry', () => {
  let analytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceStart>;

  beforeEach(() => {
    analytics = analyticsServiceMock.createAnalyticsServiceStart();
  });

  it('reports a template view with the template fields', () => {
    createLibraryTelemetry(analytics).reportTemplateViewed(TEMPLATE);

    expect(analytics.reportEvent).toHaveBeenCalledWith('workflows_template_viewed', TEMPLATE);
  });

  it('builds events field by field, so extra properties never reach telemetry', () => {
    const withExtra = { ...TEMPLATE, name: 'Acme escalation', raw: 'steps: []' };

    createLibraryTelemetry(analytics).reportTemplateViewed(withExtra);

    expect(analytics.reportEvent).toHaveBeenCalledWith('workflows_template_viewed', TEMPLATE);
  });

  it('leaves out the optional template fields when they are absent', () => {
    createLibraryTelemetry(analytics).reportTemplateViewed({
      templateSlug: 'custom',
      templateOrigin: 'import',
    });

    expect(analytics.reportEvent).toHaveBeenCalledWith('workflows_template_viewed', {
      templateSlug: 'custom',
      templateOrigin: 'import',
    });
  });

  it('reports a load failure with the slug only when given', () => {
    const telemetry = createLibraryTelemetry(analytics);

    telemetry.reportTemplateLoadFailed({ errorType: 'template_not_found' });
    telemetry.reportTemplateLoadFailed({
      errorType: 'fetch_failed',
      templateSlug: 'triage-alerts',
    });

    expect(analytics.reportEvent).toHaveBeenNthCalledWith(1, 'workflows_template_load_failed', {
      errorType: 'template_not_found',
    });
    expect(analytics.reportEvent).toHaveBeenNthCalledWith(2, 'workflows_template_load_failed', {
      errorType: 'fetch_failed',
      templateSlug: 'triage-alerts',
    });
  });

  it('reports a preview change with the view switched to', () => {
    createLibraryTelemetry(analytics).reportTemplatePreviewChanged(TEMPLATE, 'yaml');

    expect(analytics.reportEvent).toHaveBeenCalledWith('workflows_template_preview_changed', {
      ...TEMPLATE,
      previewView: 'yaml',
    });
  });

  it('reports setup opened with the form details it was given', () => {
    const telemetry = createLibraryTelemetry(analytics);

    telemetry.reportTemplateSetupOpened(TEMPLATE, {
      formFieldCount: 2,
      connectorTypes: ['.slack', '.jira'],
      connectorTypesExisting: [],
    });
    telemetry.reportTemplateSetupOpened(TEMPLATE, { formFieldCount: 1 });

    expect(analytics.reportEvent).toHaveBeenNthCalledWith(1, 'workflows_template_setup_opened', {
      ...TEMPLATE,
      formFieldCount: 2,
      connectorTypes: ['.slack', '.jira'],
      connectorTypesExisting: [],
    });
    expect(analytics.reportEvent).toHaveBeenNthCalledWith(2, 'workflows_template_setup_opened', {
      ...TEMPLATE,
      formFieldCount: 1,
    });
  });

  it('reports setup abandoned with the invalid fields only when given', () => {
    const telemetry = createLibraryTelemetry(analytics);

    telemetry.reportTemplateSetupAbandoned(TEMPLATE, ['slack-connector']);
    telemetry.reportTemplateSetupAbandoned(TEMPLATE);

    expect(analytics.reportEvent).toHaveBeenNthCalledWith(1, 'workflows_template_setup_abandoned', {
      ...TEMPLATE,
      invalidFields: ['slack-connector'],
    });
    expect(analytics.reportEvent).toHaveBeenNthCalledWith(
      2,
      'workflows_template_setup_abandoned',
      TEMPLATE
    );
  });

  it('never throws, even when the event type is not registered', () => {
    analytics.reportEvent.mockImplementation(() => {
      throw new Error('Event type "workflows_template_viewed" is not registered');
    });

    expect(() => createLibraryTelemetry(analytics).reportTemplateViewed(TEMPLATE)).not.toThrow();
  });

  it('does nothing without an analytics service', () => {
    expect(() => createLibraryTelemetry(undefined).reportTemplateViewed(TEMPLATE)).not.toThrow();
  });
});
