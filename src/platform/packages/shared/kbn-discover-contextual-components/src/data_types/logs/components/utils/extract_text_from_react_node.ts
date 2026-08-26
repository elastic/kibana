/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidElement, type ReactNode } from 'react';

/**
 * Recursively extracts plain text content from a ReactNode without rendering it.
 * Handles strings, numbers, arrays, and React elements by traversing their children.
 */
export function extractTextFromReactNode(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromReactNode).join('');
  if (isValidElement(node)) {
    const { children } = node.props as { children?: ReactNode };
    return extractTextFromReactNode(children);
  }
  return '';
}
