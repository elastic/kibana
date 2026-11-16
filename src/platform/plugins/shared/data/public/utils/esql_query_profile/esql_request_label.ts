/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@kbn/inspector-plugin/public';
import { readRequestQuery } from './json_helpers';

const SNIPPET_LENGTH = 72;

function querySnippet(request: Request): string | undefined {
  const query = readRequestQuery(request.json);
  if (query === undefined) {
    return undefined;
  }

  const singleLine = query.replace(/\s+/g, ' ').trim();
  if (!singleLine) {
    return undefined;
  }

  return singleLine.length > SNIPPET_LENGTH
    ? `${singleLine.slice(0, SNIPPET_LENGTH - 1)}…`
    : singleLine;
}

/**
 * Labels for the query profile request picker.
 * Unique inspector names stay as they are. Duplicate names, such as two Lens
 * layers both logged as "Visualization", use the ES|QL query instead.
 */
export function esqlRequestLabels(requests: Request[]): Map<string, string> {
  const labels = new Map<string, string>();

  requests.forEach((request) => {
    const peers = requests.filter((peer) => peer.name === request.name);
    if (peers.length < 2) {
      labels.set(request.id, request.name);
      return;
    }

    const snippet = querySnippet(request);
    const sameSnippet = peers.filter((peer) => querySnippet(peer) === snippet).length;
    if (snippet && sameSnippet === 1) {
      labels.set(request.id, snippet);
      return;
    }

    const index = peers.findIndex((peer) => peer.id === request.id) + 1;
    labels.set(request.id, `${request.name} (${index})`);
  });

  return labels;
}
