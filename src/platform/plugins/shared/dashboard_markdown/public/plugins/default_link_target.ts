/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A rehype plugin that sets a default `target` attribute on all `<a>` elements
 * that don't already have one (e.g. from a per-link {target=...} directive).
 */
export function defaultLinkTargetPlugin({ defaultTarget }: { defaultTarget: string }) {
  return (tree: any) => {
    const visit = (node: any) => {
      if (node.tagName === 'a' && node.properties && !node.properties.target) {
        node.properties.target = defaultTarget;
      }
      if (node.children) {
        node.children.forEach(visit);
      }
    };
    visit(tree);
  };
}
