/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Category ids whose canonical display label isn't a mechanical transform of
 * the id (e.g. `ai-agent` names the "Agent Builder" solution, not literally
 * "Ai Agent").
 */
const CATEGORY_LABEL_OVERRIDES: Record<string, string> = {
  'ai-agent': 'Agent Builder',
};

/**
 * Turn a kebab-case category id into a sentence-case display label (e.g.
 * `threat-intel` → `Threat intel`), unless it has a canonical override above.
 * Rendering the canonical `library/categories.yaml` names is a known follow-up.
 */
export function humanizeCategoryId(id: string): string {
  if (CATEGORY_LABEL_OVERRIDES[id]) {
    return CATEGORY_LABEL_OVERRIDES[id];
  }

  const words = id.split('-').filter((word) => word.length > 0);
  return words
    .map((word, index) => (index === 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}
