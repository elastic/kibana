/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/public';
import type { WorkflowTemplateOrigin } from '@kbn/workflows';

/**
 * The flow the user is in on a template page: `catalog` for a catalog template, `import` for
 * an imported template file. A workflow installed from that page gets the same origin.
 */
export type LibraryTemplateOrigin = Extract<WorkflowTemplateOrigin, 'catalog' | 'import'>;

/** Sent with every event about one template, with the server event's names and values. */
export interface TemplateTelemetryFields {
  templateSlug: string;
  templateVersion?: string;
  templateOrigin: LibraryTemplateOrigin;
  solutions?: string[];
}

export const TEMPLATE_VIEWED_EVENT_TYPE = 'workflows_template_viewed';
export const TEMPLATE_LOAD_FAILED_EVENT_TYPE = 'workflows_template_load_failed';
export const TEMPLATE_PREVIEW_CHANGED_EVENT_TYPE = 'workflows_template_preview_changed';
export const TEMPLATE_SETUP_OPENED_EVENT_TYPE = 'workflows_template_setup_opened';
export const TEMPLATE_SETUP_ABANDONED_EVENT_TYPE = 'workflows_template_setup_abandoned';

/** The server's `errorType` values for the same failures. */
export type TemplateLoadErrorType = 'template_not_found' | 'fetch_failed';

export type TemplatePreviewView = 'graph' | 'yaml';

export type TemplateViewedEvent = TemplateTelemetryFields;

export interface TemplateLoadFailedEvent {
  errorType: TemplateLoadErrorType;
  templateSlug?: string;
}

export interface TemplatePreviewChangedEvent extends TemplateTelemetryFields {
  previewView: TemplatePreviewView;
}

export interface TemplateSetupOpenedEvent extends TemplateTelemetryFields {
  formFieldCount: number;
  connectorTypes?: string[];
  connectorTypesExisting?: string[];
}

export interface TemplateSetupAbandonedEvent extends TemplateTelemetryFields {
  invalidFields?: string[];
}

const templateFieldsSchema: RootSchema<TemplateTelemetryFields> = {
  templateSlug: {
    type: 'keyword',
    _meta: {
      description:
        'Workflow Template library slug. For an imported template file: the slug when the catalog lists it, `custom` when it does not, `unresolved` when the browser had no catalog to check it',
    },
  },
  templateVersion: {
    type: 'keyword',
    _meta: {
      description:
        'Template version. For an imported template file, sent only when it matches the catalog version',
      optional: true,
    },
  },
  templateOrigin: {
    type: 'keyword',
    _meta: {
      description:
        'The flow the user is in: catalog (catalog template page) or import (imported template file). A workflow installed from the page gets the same origin',
    },
  },
  solutions: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Solution the catalog lists the template under' },
    },
    _meta: {
      description:
        'Solutions the catalog lists the template under; empty for a cross-solution template. Absent for a template the catalog does not list',
      optional: true,
    },
  },
};

const templateViewedSchema: RootSchema<TemplateViewedEvent> = templateFieldsSchema;

const templateLoadFailedSchema: RootSchema<TemplateLoadFailedEvent> = {
  errorType: {
    type: 'keyword',
    _meta: {
      description:
        'Why the template page could not show the template: template_not_found or fetch_failed (after the request retries)',
    },
  },
  templateSlug: {
    type: 'keyword',
    _meta: {
      description:
        'Slug of the template that failed to load, only for fetch_failed and only when the catalog the browser already has lists it',
      optional: true,
    },
  },
};

const templatePreviewChangedSchema: RootSchema<TemplatePreviewChangedEvent> = {
  ...templateFieldsSchema,
  previewView: {
    type: 'keyword',
    _meta: { description: 'The preview the user switched to: graph or yaml' },
  },
};

const templateSetupOpenedSchema: RootSchema<TemplateSetupOpenedEvent> = {
  ...templateFieldsSchema,
  formFieldCount: {
    type: 'integer',
    _meta: { description: 'Number of fields in the template install form' },
  },
  connectorTypes: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Connector type of a connector field in the install form' },
    },
    _meta: {
      description:
        'Connector types of the install form connector fields, required or optional (catalog only)',
      optional: true,
    },
  },
  connectorTypesExisting: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Connector type the user already has a connector for' },
    },
    _meta: {
      description:
        'The connectorTypes the user already has at least one connector for; empty when they have none. Absent when the connector list failed to load (catalog only)',
      optional: true,
    },
  },
};

const templateSetupAbandonedSchema: RootSchema<TemplateSetupAbandonedEvent> = {
  ...templateFieldsSchema,
  invalidFields: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Name of an install form field that failed validation' },
    },
    _meta: {
      description:
        'Install form field names (never values) that were empty or invalid when the user left (catalog only)',
      optional: true,
    },
  },
};

/** Workflow Template library browser events; registered by the Workflows Management plugin. */
export const libraryTelemetryEventTypes: ReadonlyArray<EventTypeOpts<object>> = [
  { eventType: TEMPLATE_VIEWED_EVENT_TYPE, schema: templateViewedSchema },
  { eventType: TEMPLATE_LOAD_FAILED_EVENT_TYPE, schema: templateLoadFailedSchema },
  { eventType: TEMPLATE_PREVIEW_CHANGED_EVENT_TYPE, schema: templatePreviewChangedSchema },
  { eventType: TEMPLATE_SETUP_OPENED_EVENT_TYPE, schema: templateSetupOpenedSchema },
  { eventType: TEMPLATE_SETUP_ABANDONED_EVENT_TYPE, schema: templateSetupAbandonedSchema },
];
