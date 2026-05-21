/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import type { EsqlColumnHighlight } from '@kbn/esql-utils';

export type HighlightTags = Pick<EsqlColumnHighlight, 'preTag' | 'postTag'>;
interface HighlightedTextProps {
  value: string;
  tags: HighlightTags;
}

/**
 * Renders a string with highlight tags as React nodes.
 */
export function getHighlightCellRenderer(value: unknown, highlightTags: HighlightTags) {
  if (value === undefined) {
    return '-';
  }
  if (typeof value !== 'string') {
    return String(value);
  }
  return <MemoizedHighlightedText value={value} tags={highlightTags} />;
}

const HighlightedText = function HighlightedText({
  value,
  tags: { preTag, postTag },
}: HighlightedTextProps) {
  if (!value.includes(preTag)) {
    return <>{value}</>;
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
    return <>{nodes[0]}</>;
  }

  return <>{nodes}</>;
};

const MemoizedHighlightedText = memo(
  HighlightedText,
  (prevProps, nextProps) =>
    prevProps.value === nextProps.value &&
    prevProps.tags.preTag === nextProps.tags.preTag &&
    prevProps.tags.postTag === nextProps.tags.postTag
);
