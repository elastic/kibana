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
 * `{pageId}` is the trigger's `page-id`: assigned on first save, kept across edits,
 * replaced on clone, import, and rotate. It identifies the page but is not secret.
 * `{secret}` is derived from the page-id with the deployment signing key, so it is
 * never stored and never appears in the workflow YAML.
 */
export const PAGE_FORM_API_PATH = '/api/workflows/pages/{pageId}/{secret}';

/** Authenticated helper that lists a workflow's page URLs for its author. */
export const PAGE_LINK_API_PATH = '/internal/workflows/pages/{workflowId}/link';

/** Authenticated helper that assigns a page a new `page-id`, which retires its old URL. */
export const PAGE_ROTATE_API_PATH = '/internal/workflows/pages/{workflowId}/{pageId}/_rotate';

export const PAGE_WORKFLOW_ID_MAX_LENGTH = 128;
export const PAGE_ID_PARAM_MAX_LENGTH = 64;
