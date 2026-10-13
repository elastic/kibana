/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Public page URL. GET renders the form, POST submits it. Spaces strips the
 * `/s/{spaceId}` prefix before routing, so one path serves every space.
 *
 * `{secret}` is the page's capability: anyone with the URL can submit the page.
 * It lives in an encrypted saved object, never in the YAML or the workflow
 * document, and rotating replaces it.
 */
export const PAGE_FORM_PATH = '/pages/{workflowId}/k/{secret}';

export { PAGE_LINK_API_PATH, PAGE_ROTATE_API_PATH } from '../../../common/lib/api_constants';

export const PAGE_WORKFLOW_ID_MAX_LENGTH = 255;

/** A secret is 43 base64url characters; leave room without accepting unbounded input. */
export const PAGE_SECRET_MAX_LENGTH = 64;
