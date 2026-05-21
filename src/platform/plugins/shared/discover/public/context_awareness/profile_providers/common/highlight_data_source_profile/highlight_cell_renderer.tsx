/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EsqlColumnHighlight } from '@kbn/esql-utils';

export type HighlightTags = Pick<EsqlColumnHighlight, 'preTag' | 'postTag'>;

export function getHighlightCellRenderer(value: unknown, highlightTags: HighlightTags) {
  if (value === undefined) {
    return '-';
  }
  if (typeof value !== 'string') {
    return value;
  }
  return <>{stringToHighlightedReactNode(value, highlightTags)}</>;
}

/**
 * Converts a string with TOP_SNIPPETS highlight markup into React nodes.
 */
export const stringToHighlightedReactNode = (
  value: string,
  { preTag, postTag }: HighlightTags
): React.ReactNode => {
  if (!value.includes(preTag)) {
    return value;
  }

  const nodes: React.ReactNode[] = [];
  let remaining = value;
  let key = 0;

  while (remaining.length > 0) {
    const openIndex = remaining.indexOf(preTag);
    if (openIndex === -1) {
      nodes.push(remaining);
      break;
    }

    if (openIndex > 0) {
      nodes.push(remaining.slice(0, openIndex));
    }

    const contentStart = openIndex + preTag.length;
    const closeIndex = remaining.indexOf(postTag, contentStart);

    if (closeIndex === -1) {
      nodes.push(remaining.slice(openIndex));
      break;
    }

    nodes.push(
      <mark className="ffSearch__highlight" key={key++}>
        {remaining.slice(contentStart, closeIndex)}
      </mark>
    );
    remaining = remaining.slice(closeIndex + postTag.length);
  }

  if (nodes.length === 1) {
    return nodes[0];
  }

  return <>{nodes}</>;
};
