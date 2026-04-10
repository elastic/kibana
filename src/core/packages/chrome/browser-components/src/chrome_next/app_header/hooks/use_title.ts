/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useNextHeader, useProjectBreadcrumbs } from '../../../shared/chrome_hooks';
import { getBreadcrumbPlainText } from '../../../shared/breadcrumb_utils';

/**
 * Resolution: explicit `config.title` -> last project breadcrumb text -> `undefined`.
 */
export function useTitle(): string | undefined {
  const config = useNextHeader();
  const breadcrumbs = useProjectBreadcrumbs();

  if (config?.title) {
    return config.title;
  }

  if (breadcrumbs.length === 0) {
    return undefined;
  }

  const crumbForTitle = breadcrumbs[breadcrumbs.length - 1];
  const plain = getBreadcrumbPlainText(crumbForTitle);
  if (plain) {
    return plain;
  }

  return undefined;
}
