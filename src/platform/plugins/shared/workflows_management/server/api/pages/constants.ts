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
 * `{pageKey}` is an opaque random id stored on the workflow document, so the URL
 * reveals nothing about the workflow. `{secret}` is derived from the page key with the
 * deployment signing key, so it is never stored and never appears in the YAML.
 */
export const PAGE_FORM_API_PATH = '/api/workflows/pages/{pageKey}/{secret}';

export { PAGE_LINK_API_PATH, PAGE_ROTATE_API_PATH } from '../../../common/lib/api_constants';

export const PAGE_WORKFLOW_ID_MAX_LENGTH = 255;

/** A UUID v4 is 36 characters; leave room without accepting unbounded input. */
export const PAGE_KEY_MAX_LENGTH = 64;
