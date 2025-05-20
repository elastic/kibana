/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const options = {
  expand: false,
  omitAnnotationLines: true,
};

export function shouldLogUnsavedChanges() {
  // @ts-expect-error
  return Boolean(window?.ELASTIC_DASHBOARD_LOGGER);
}

/**
 * Conditional (window.ELASTIC_DASHBOARD_LOGGER needs to be set to true) logger function
 */
export async function logUnsavedChange(label: string, lastValue: unknown, currentValue: unknown) {
  if (!shouldLogUnsavedChanges()) return;

  const { diff } = await import('jest-diff');
  // eslint-disable-next-line no-console
  console.log(`[Dashboard] ${label} unsaved changes\n${diff(lastValue, currentValue, options)}`);
}
