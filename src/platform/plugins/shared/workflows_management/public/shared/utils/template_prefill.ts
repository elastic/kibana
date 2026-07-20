/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Query-string key carrying a Workflow Template Library slug on
 * `/create?fromTemplate=<slug>`. The create page fetches the template by slug
 * and seeds the editor with its rendered YAML, so the link is stable across
 * refreshes and shareable. Unknown or unavailable slugs fall back to the
 * default create-page YAML.
 */
export const FROM_TEMPLATE_QUERY_PARAM = 'fromTemplate';

/** Read the template slug from a `location.search` string, if present. */
export const getFromTemplateSlug = (search: string): string | undefined =>
  new URLSearchParams(search).get(FROM_TEMPLATE_QUERY_PARAM) ?? undefined;
