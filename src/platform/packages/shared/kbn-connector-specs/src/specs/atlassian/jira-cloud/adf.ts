/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Converts a plain-text string to minimal Atlassian Document Format (ADF).
 *
 * Jira Cloud REST API v3 rejects plain strings for description and comment body
 * fields; it requires ADF. This helper wraps a plain string in a single-level
 * doc → paragraph structure, splitting on newlines so that line breaks in the
 * input become separate paragraphs in Jira.
 *
 * Empty lines produce empty paragraphs, which is valid ADF. A paragraph node
 * with `content: [{ type: 'text', text: '' }]` is NOT valid and causes a 400
 * from Jira, so empty lines must emit `content: []` instead.
 */
export const toAdf = (text: string) => ({
  version: 1,
  type: 'doc',
  content: text.split(/\r?\n/).map((line) => ({
    type: 'paragraph',
    content: line === '' ? [] : [{ type: 'text', text: line }],
  })),
});
