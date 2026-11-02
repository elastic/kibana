/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiDeclaration } from '../../types';

/**
 * Generates a link to the GitHub source for an API declaration.
 *
 * When a `lineNumber` is available, produces a direct `#L42`-style anchor.
 * Otherwise falls back to a text-fragment search (`#:~:text=...`).
 *
 * TODO: clintandrewhall - allow `base` to be overridden in the instance of a CI build
 * associated with a PR.
 *
 * @param declaration - API declaration to generate link for.
 * @returns GitHub link to the source code.
 */
export const getLink = (declaration: ApiDeclaration): string => {
  const base = `https://github.com/elastic/kibana/blob/main/${declaration.path}`;
  if (declaration.lineNumber) {
    return `${base}#L${declaration.lineNumber}`;
  }
  return `https://github.com/elastic/kibana/tree/main/${
    declaration.path
  }#:~:text=${encodeURIComponent(declaration.label)}`;
};
