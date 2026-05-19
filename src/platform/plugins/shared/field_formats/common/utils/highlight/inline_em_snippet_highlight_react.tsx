/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

const OPEN_TAG = '<em>';
const CLOSE_TAG = '</em>';

export function getInlineEmSnippetHighlightReact(value: string): React.ReactNode {
  if (!value.includes(OPEN_TAG)) {
    return value;
  }

  const nodes: React.ReactNode[] = [];
  let rest = value;
  let key = 0;

  while (rest.length > 0) {
    const openIdx = rest.indexOf(OPEN_TAG);

    // No more highlights
    if (openIdx === -1) {
      nodes.push(rest);
      break;
    }

    if (openIdx > 0) {
      nodes.push(rest.slice(0, openIdx));
    }
    rest = rest.slice(openIdx + OPEN_TAG.length);
    const closeIdx = rest.indexOf(CLOSE_TAG);

    // Malformed highlight with no closing tag, return as is
    if (closeIdx === -1) {
      nodes.push(`${OPEN_TAG}${rest}`);
      break;
    }

    const inner = rest.slice(0, closeIdx);
    nodes.push(
      <mark className="ffSearch__highlight" key={`highlight-${key++}`}>
        {inner}
      </mark>
    );
    rest = rest.slice(closeIdx + CLOSE_TAG.length);
  }

  if (nodes.length === 0) {
    return value;
  }
  if (nodes.length === 1) {
    return nodes[0];
  }
  return <>{nodes}</>;
}
