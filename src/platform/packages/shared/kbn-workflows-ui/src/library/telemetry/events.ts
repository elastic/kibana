/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowTemplateOrigin } from '@kbn/workflows';

/** The origin a workflow installed from a template page gets: a catalog template or an imported file. */
export type LibraryTemplateOrigin = Extract<WorkflowTemplateOrigin, 'catalog' | 'import'>;

/** The step of a template page: the template summary or the install form. */
export type TemplateStep = 'details' | 'setup';

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
export const TEMPLATE_REMIX_CLICKED_EVENT_TYPE = 'workflows_template_remix_clicked';
export const TEMPLATE_IMPORT_OPENED_EVENT_TYPE = 'workflows_template_import_opened';
export const TEMPLATE_IMPORT_FILE_VALIDATED_EVENT_TYPE = 'workflows_template_import_file_validated';
export const TEMPLATE_LINK_CLICKED_EVENT_TYPE = 'workflows_template_link_clicked';

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

export interface TemplateRemixClickedEvent extends TemplateTelemetryFields {
  step: TemplateStep;
}

/** No fields: the event itself is the signal. */
export type TemplateImportOpenedEvent = Record<string, never>;

/** `template_parse` is the server's `errorType` value for the same check. */
export type TemplateImportFileErrorType = 'template_parse' | 'file_too_large' | 'file_read_failed';

export interface TemplateImportFileValidatedEvent {
  success: boolean;
  errorType?: TemplateImportFileErrorType;
}

/** The GitHub links in the library: the catalog page header and a catalog template's page. */
export type TemplateLink =
  | 'request_template'
  | 'contribute_template'
  | 'report_issue'
  | 'edit_template';

export interface TemplateLinkClickedEvent extends Partial<TemplateTelemetryFields> {
  link: TemplateLink;
}
