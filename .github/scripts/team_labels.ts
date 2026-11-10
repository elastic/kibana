/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type Label = string | { name?: string };

/** Select existing ownership labels, including legacy colon-prefixed team labels. */
export const getTeamLabels = (labels: readonly Label[]): string[] => [
  ...new Set(
    labels.flatMap((label) => {
      const name = typeof label === 'string' ? label : label.name;
      return name && (/^team\s*:/i.test(name) || name.startsWith(':')) ? [name] : [];
    })
  ),
];
