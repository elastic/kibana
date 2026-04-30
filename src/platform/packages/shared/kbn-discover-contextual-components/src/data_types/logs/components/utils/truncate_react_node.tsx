/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';

/**
 * Truncates text content with "..." inserted in the middle, preserving React element structure
 * (e.g., search highlight <mark> tags) when possible.
 *
 * @param node The React node to truncate
 * @param maxLength Maximum length before truncation
 * @param text The plain text representation of the node, used for length check and truncation
 */
export function truncateReactNode(node: ReactNode, maxLength: number, text: string): ReactNode {
  if (text.length <= maxLength) {
    return node;
  }

  const halfLength = Math.floor(maxLength / 2);
  if (halfLength === 0) {
    return '...';
  }
  const startText = text.slice(0, halfLength);
  const endText = text.slice(-halfLength);
  const truncatedText = `${startText}...${endText}`;

  return truncateNodeContent(node, text, truncatedText);
}

/**
 * Recursively processes a React node tree, replacing the original text content
 * with truncated text while preserving the element structure (e.g., highlight marks).
 */
function truncateNodeContent(
  node: ReactNode,
  originalText: string,
  truncatedText: string
): ReactNode {
  if (node == null || typeof node === 'boolean') {
    return node;
  }

  if (typeof node === 'string') {
    if (node === originalText) {
      return truncatedText;
    }
    return node;
  }

  if (typeof node === 'number') {
    return node;
  }

  // For arrays, try to preserve single-element structure, otherwise fall back to plain text
  if (Array.isArray(node)) {
    if (node.length === 1) {
      return [truncateNodeContent(node[0], originalText, truncatedText)];
    }
    // Complex multi-element arrays fall back to plain truncated text
    return truncatedText;
  }

  // For React elements, recurse into children while preserving the element wrapper
  if (React.isValidElement(node)) {
    const { children } = node.props as { children?: ReactNode };
    if (children !== undefined) {
      const truncatedChildren = truncateNodeContent(children, originalText, truncatedText);
      return React.cloneElement(node, undefined, truncatedChildren);
    }
    return node;
  }

  return node;
}
