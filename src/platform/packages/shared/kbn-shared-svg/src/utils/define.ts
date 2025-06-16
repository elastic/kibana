/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DOMParser, XMLSerializer, type Element } from '@xmldom/xmldom';

function queryAllElementsContainingAttribute(
  this: ReturnType<typeof DOMParser.prototype.parseFromString>,
  attributeSelector: string
) {
  const matchingElements: Element[] = [];

  // Traverse the entire document to find elements with the 'fill' attribute
  const traverse = (node: Element) => {
    if (node.nodeType === node.ELEMENT_NODE) {
      // Check if it's an element node
      if (node.hasAttribute(attributeSelector)) {
        matchingElements.push(node);
      }

      // Recursively check child nodes
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }
  };

  traverse(this.documentElement!);

  return matchingElements;
}

interface IParseFromString extends ReturnType<typeof DOMParser.prototype.parseFromString> {
  queryAllElementsContainingAttribute: typeof queryAllElementsContainingAttribute;
}

const parseFromString = (
  ...args: Parameters<typeof DOMParser.prototype.parseFromString>
): IParseFromString => {
  const result = new DOMParser().parseFromString(...args);

  return {
    ...result,
    queryAllElementsContainingAttribute: queryAllElementsContainingAttribute.bind(result),
  };
};

export function styledSVG(svg: TemplateStringsArray): string {
  const fills: Record<string, `--${string}`> = {};

  const doc = parseFromString(String(svg), 'image/svg+xml');

  doc.queryAllElementsContainingAttribute('fill').forEach((node, index) => {
    const fillValue = node.getAttribute('fill')!;

    if (!fills[fillValue]) {
      // TODO: get existing styles to avoid overwriting them, also consider case where fill is already defined so this operation is idempotent
      // const nodeStyle = node.getAttribute('style') || '';
      // FIXME: generate a more suitable name for this variable
      const variableName = `--image-`;

      fills[fillValue] = variableName;

      node.setAttribute('style', `fill:var(${variableName}, ${fillValue})`);
    } else {
      node.setAttribute('style', `fill:var(${fills[fillValue]}, ${fillValue})`);
    }

    // remove the fill attribute after transform
    node.removeAttribute('fill');
  });

  return new XMLSerializer().serializeToString(doc);
}
