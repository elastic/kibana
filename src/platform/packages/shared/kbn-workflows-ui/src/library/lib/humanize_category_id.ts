/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Turn a kebab-case category id into a sentence-case display label (e.g.
 * `threat-intel` → `Threat intel`). Rendering the canonical
 * `library/categories.yaml` names is a known follow-up.
 */
export function humanizeCategoryId(id: string): string {
  const words = id.split('-').filter((word) => word.length > 0);
  return words
    .map((word, index) => (index === 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}
