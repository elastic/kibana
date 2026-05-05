/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';

/**
 * Formats an array value as React nodes with bracket/comma notation,
 * mirroring the HTML content type's array rendering.
 *
 * Single-element and empty arrays are passed through without brackets.
 *
 * This should be applied at the call site (e.g. inside reactConvert)
 * rather than inside individual formatter's reactConvertSingle, so that formatters which
 * override reactConvertSingle get correct array rendering for free.
 */
export function formatReactArray(
  val: unknown[],
  convertSingle: (v: unknown) => ReactNode
): ReactNode {
  if (val.length === 0) return '';

  const subNodes = val.map(convertSingle);
  if (val.length === 1) return subNodes[0] ?? '';

  const useMultiLine = subNodes.some(hasNewline);
  const newLine = useMultiLine ? '\n  ' : ' ';

  const items: ReactNode[] = [];
  subNodes.forEach((node, i) => {
    const rendered = useMultiLine ? indentNode(node) : node;
    items.push(withKey(rendered, `item-${i}`));
    if (i < subNodes.length - 1) {
      items.push(withArrayStyles(',', `punct-${i}`));
      items.push(newLine);
    }
  });

  return (
    <>
      {withArrayStyles('[')}
      {useMultiLine && '\n  '}
      {items}
      {useMultiLine && '\n'}
      {withArrayStyles(']')}
    </>
  );
}

const withArrayStyles = (text: string, key?: string) => (
  <span key={key ?? text} className="ffArray__highlight">
    {text}
  </span>
);

const withKey = (node: ReactNode, key: string | number): ReactNode =>
  React.isValidElement(node) ? React.cloneElement(node as React.ReactElement, { key }) : node;

/**
 * Recursively checks whether a ReactNode contains a newline anywhere in its text content.
 * Necessary because convertSingle may return a React element (e.g. <mark> from getHighlightReact)
 * rather than a plain string, so a simple typeof === 'string' check would miss those cases.
 */
function hasNewline(node: ReactNode): boolean {
  if (typeof node === 'string') return node.includes('\n');
  if (Array.isArray(node)) return node.some(hasNewline);
  if (React.isValidElement(node))
    return hasNewline((node.props as { children?: ReactNode }).children);
  return false;
}

/**
 * Recursively adds two-space indentation after every newline run in a ReactNode tree,
 * mirroring html_content_type's replaceAll(/(\n+)/g, '$1  ') but for arbitrary React nodes.
 * Using a regex that captures the full newline run preserves blank lines (consecutive newlines)
 * by appending the indent only once after the entire run, not after each individual newline.
 */
function indentNode(node: ReactNode): ReactNode {
  if (typeof node === 'string') return node.replaceAll(/(\n+)/g, '$1  ');
  if (Array.isArray(node)) return node.map(indentNode);
  if (React.isValidElement(node)) {
    const { children } = node.props as { children?: ReactNode };
    return children != null ? React.cloneElement(node, { children: indentNode(children) }) : node;
  }
  return node;
}
