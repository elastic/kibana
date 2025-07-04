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

export function shouldLogStateDiff() {
  // @ts-expect-error
  return Boolean(window?.ELASTIC_PRESENTATION_LOGGER);
}

/**
 * Conditional (window.ELASTIC_PRESENTATION_LOGGER needs to be set to true) logger function
 */
export async function logStateDiff(label: string, lastValue: unknown, currentValue: unknown) {
  if (!shouldLogStateDiff()) return;

  const { diff } = await import('jest-diff');
  // eslint-disable-next-line no-console
  console.log(`[Embeddable] ${label} state diff\n${diff(lastValue, currentValue, options)}`);
}
