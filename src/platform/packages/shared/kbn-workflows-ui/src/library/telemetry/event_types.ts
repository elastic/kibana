/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/public';
import type {
  TemplateImportFileValidatedEvent,
  TemplateImportOpenedEvent,
  TemplateLinkClickedEvent,
  TemplateLoadFailedEvent,
  TemplatePreviewChangedEvent,
  TemplateRemixClickedEvent,
  TemplateSetupAbandonedEvent,
  TemplateSetupOpenedEvent,
  TemplateTelemetryFields,
  TemplateViewedEvent,
} from './events';
import {
  TEMPLATE_IMPORT_FILE_VALIDATED_EVENT_TYPE,
  TEMPLATE_IMPORT_OPENED_EVENT_TYPE,
  TEMPLATE_LINK_CLICKED_EVENT_TYPE,
  TEMPLATE_LOAD_FAILED_EVENT_TYPE,
  TEMPLATE_PREVIEW_CHANGED_EVENT_TYPE,
  TEMPLATE_REMIX_CLICKED_EVENT_TYPE,
  TEMPLATE_SETUP_ABANDONED_EVENT_TYPE,
  TEMPLATE_SETUP_OPENED_EVENT_TYPE,
  TEMPLATE_VIEWED_EVENT_TYPE,
} from './events';

const TEMPLATE_SLUG_DESCRIPTION =
  'Workflow Template library slug. For an imported template file: the slug when the catalog lists it, `custom` when it does not, `unresolved` when the browser had no catalog to check it';
const TEMPLATE_VERSION_DESCRIPTION =
  'Template version. For an imported template file, sent only when it matches the catalog version';
const TEMPLATE_ORIGIN_DESCRIPTION =
  'The flow the user is in: catalog (catalog template page) or import (imported template file). A workflow installed from the page gets the same origin';
const SOLUTIONS_DESCRIPTION =
  'Solutions the catalog lists the template under; empty for a cross-solution template. Absent for a template the catalog does not list';
const SOLUTION_ITEM_SCHEMA = {
  type: 'keyword',
  _meta: { description: 'Solution the catalog lists the template under' },
} as const;

const templateFieldsSchema: RootSchema<TemplateTelemetryFields> = {
  templateSlug: { type: 'keyword', _meta: { description: TEMPLATE_SLUG_DESCRIPTION } },
  templateVersion: {
    type: 'keyword',
    _meta: { description: TEMPLATE_VERSION_DESCRIPTION, optional: true },
  },
  templateOrigin: { type: 'keyword', _meta: { description: TEMPLATE_ORIGIN_DESCRIPTION } },
  solutions: {
    type: 'array',
    items: SOLUTION_ITEM_SCHEMA,
    _meta: { description: SOLUTIONS_DESCRIPTION, optional: true },
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
        'Install form field names (never values) that were required and empty, or had an invalid value, when the user left (catalog only)',
      optional: true,
    },
  },
};

const templateRemixClickedSchema: RootSchema<TemplateRemixClickedEvent> = {
  ...templateFieldsSchema,
  step: {
    type: 'keyword',
    _meta: {
      description:
        'Where Remix with AI was clicked: details (template summary) or setup (install form)',
    },
  },
};

const templateImportOpenedSchema: RootSchema<TemplateImportOpenedEvent> = {};

const templateImportFileValidatedSchema: RootSchema<TemplateImportFileValidatedEvent> = {
  success: {
    type: 'boolean',
    _meta: { description: 'Whether the selected file is a template that can be imported' },
  },
  errorType: {
    type: 'keyword',
    _meta: {
      description:
        'Why the file was rejected: template_parse (not a valid template), file_too_large or file_read_failed',
      optional: true,
    },
  },
};

const LINK_TEMPLATE_ONLY = ' (report_issue and edit_template only)';

const templateLinkClickedSchema: RootSchema<TemplateLinkClickedEvent> = {
  link: {
    type: 'keyword',
    _meta: {
      description:
        'The GitHub link clicked: request_template or contribute_template (catalog page), report_issue or edit_template (catalog template page)',
    },
  },
  templateSlug: {
    type: 'keyword',
    _meta: { description: TEMPLATE_SLUG_DESCRIPTION + LINK_TEMPLATE_ONLY, optional: true },
  },
  templateVersion: {
    type: 'keyword',
    _meta: { description: TEMPLATE_VERSION_DESCRIPTION + LINK_TEMPLATE_ONLY, optional: true },
  },
  templateOrigin: {
    type: 'keyword',
    _meta: { description: TEMPLATE_ORIGIN_DESCRIPTION + LINK_TEMPLATE_ONLY, optional: true },
  },
  solutions: {
    type: 'array',
    items: SOLUTION_ITEM_SCHEMA,
    _meta: { description: SOLUTIONS_DESCRIPTION + LINK_TEMPLATE_ONLY, optional: true },
  },
};

/** Workflow Template library browser events; registered by the Workflows Management plugin. */
export const libraryTelemetryEventTypes: ReadonlyArray<EventTypeOpts<object>> = [
  { eventType: TEMPLATE_VIEWED_EVENT_TYPE, schema: templateViewedSchema },
  { eventType: TEMPLATE_LOAD_FAILED_EVENT_TYPE, schema: templateLoadFailedSchema },
  { eventType: TEMPLATE_PREVIEW_CHANGED_EVENT_TYPE, schema: templatePreviewChangedSchema },
  { eventType: TEMPLATE_SETUP_OPENED_EVENT_TYPE, schema: templateSetupOpenedSchema },
  { eventType: TEMPLATE_SETUP_ABANDONED_EVENT_TYPE, schema: templateSetupAbandonedSchema },
  { eventType: TEMPLATE_REMIX_CLICKED_EVENT_TYPE, schema: templateRemixClickedSchema },
  { eventType: TEMPLATE_IMPORT_OPENED_EVENT_TYPE, schema: templateImportOpenedSchema },
  {
    eventType: TEMPLATE_IMPORT_FILE_VALIDATED_EVENT_TYPE,
    schema: templateImportFileValidatedSchema,
  },
  { eventType: TEMPLATE_LINK_CLICKED_EVENT_TYPE, schema: templateLinkClickedSchema },
];
