/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from 'unist';
import type { Link, Parent, Text } from 'mdast';

interface NodeDataWithHProperties {
  hProperties?: Record<string, string>;
  [key: string]: unknown;
}

const ALLOWED_ATTRIBUTES = new Set(['target']);

function isParent(node: Node): node is Parent {
  return 'children' in node;
}

function isLink(node: Node): node is Link {
  return node.type === 'link';
}

function isText(node: Node): node is Text {
  return node.type === 'text';
}

/**
 * Parses an attribute block like `{target="_blank" rel="noopener"}` from the
 * start of a string. Returns the parsed (and whitelisted) attributes and the
 * number of characters consumed, or null if no attribute block was found.
 */
function parseAttributeBlock(
  raw: string
): { attrs: Record<string, string>; length: number } | null {
  const braceMatch = raw.match(/^\{([^}]+)\}/);
  if (!braceMatch) return null;

  /**
   * Matches key=value pairs in three flavors:
   *   key="double quoted value"
   *   key='single quoted value'
   *   key=unquoted_value  (terminated by whitespace or end of string)
   */
  const keyValRegex = /([\w-]+)=(?:"([^"]*)"|'([^']*)'|(\S+?)(?=\s|$))/g;
  const attrs = [...braceMatch[1].matchAll(keyValRegex)].reduce((acc, match) => {
    if (ALLOWED_ATTRIBUTES.has(match[1])) {
      acc[match[1]] = match[2] ?? match[3] ?? match[4];
    }
    return acc;
  }, {} as Record<string, string>);

  if (Object.keys(attrs).length === 0) return null;
  return { attrs, length: braceMatch[0].length };
}

/**
 * A remark parsing plugin that extracts inline attribute blocks from text
 * immediately following a markdown link. For example:
 *
 *   [click here](https://example.com){target="_blank"}
 *
 * The `{target="_blank"}` is parsed and applied to the link node via
 * `data.hProperties`, which mdast-util-to-hast merges into the HTML element's
 * attributes. Only attributes in ALLOWED_ATTRIBUTES are applied.
 */
export function linkAttributesParsingPlugin() {
  return () => {
    const visitor = (node: Node) => {
      if (!isParent(node)) return;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const nextIndex = i + 1;

        // For each link, examine the node immediately next to it
        if (isLink(child) && nextIndex < node.children.length) {
          const next = node.children[nextIndex];
          // If the character immediately after the link node is a curly brace, parse the contents of the curly braces
          if (isText(next) && next.value.startsWith('{')) {
            const result = parseAttributeBlock(next.value);
            if (result) {
              const data = (child.data ?? {}) as NodeDataWithHProperties;
              child.data = {
                ...data,
                hProperties: { ...data.hProperties, ...result.attrs },
              };
              next.value = next.value.slice(result.length);
              if (!next.value) {
                node.children.splice(nextIndex, 1);
              }
            }
          }
        }

        visitor(child);
      }
    };

    return (tree: Node) => {
      visitor(tree);
    };
  };
}
