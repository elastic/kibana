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
 * The POC addresses a page by workflow id. The real feature routes by an
 * admin-owned slug held on a saved object, so a link survives a workflow rename
 * and one workflow can back several pages.
 */
export const PAGE_FORM_API_PATH = '/api/workflows/pages/{workflowId}';

/** Authenticated helper that hands the author the shareable link. */
export const PAGE_LINK_API_PATH = '/internal/workflows/pages/{workflowId}/link';

export const PAGE_WORKFLOW_ID_MAX_LENGTH = 128;
export const PAGE_TOKEN_MAX_LENGTH = 128;
