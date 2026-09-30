/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Public page endpoint. GET renders the form, POST submits it.
 *
 * Keyed by the trigger's `page-id` (like n8n's `webhookId`): assigned on first save,
 * kept across edits, and replaced on clone and import. The ID is unguessable, so it is
 * the credential for "anyone with the link" pages.
 */
export const PAGE_FORM_API_PATH = '/api/workflows/pages/{pageId}';

/** Authenticated helper that lists a workflow's page URLs for its author. */
export const PAGE_LINK_API_PATH = '/internal/workflows/pages/{workflowId}/link';

export const PAGE_WORKFLOW_ID_MAX_LENGTH = 128;
export const PAGE_ID_PARAM_MAX_LENGTH = 64;
