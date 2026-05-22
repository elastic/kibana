/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isRecord } from '../is_record';

const isTighteningTransition = (apa: unknown): boolean =>
  isRecord(apa) && (apa.from === null || apa.from === true) && apa.to === false;

const rootTightenings = (schemaDiff: Record<string, unknown>, pointer: string): string[] =>
  isTighteningTransition(schemaDiff.additionalPropertiesAllowed) ? [pointer] : [];

const propertyTightenings = (schemaDiff: Record<string, unknown>, pointer: string): string[] => {
  const properties = schemaDiff.properties;
  if (!isRecord(properties) || !isRecord(properties.modified)) return [];
  return Object.entries(properties.modified).flatMap(([propName, propDiff]) =>
    collectTighteningsInSchemaDiff(propDiff, `${pointer}/properties/${propName}`)
  );
};

const itemTightenings = (schemaDiff: Record<string, unknown>, pointer: string): string[] =>
  isRecord(schemaDiff.items)
    ? collectTighteningsInSchemaDiff(schemaDiff.items, `${pointer}/items`)
    : [];

const compositionTightenings = (schemaDiff: Record<string, unknown>, pointer: string): string[] =>
  (['oneOf', 'anyOf', 'allOf'] as const).flatMap((keyword) => {
    const container = schemaDiff[keyword];
    if (!isRecord(container) || !Array.isArray(container.modified)) return [];
    return container.modified.flatMap((branch, index) =>
      isRecord(branch) && branch.diff !== undefined
        ? collectTighteningsInSchemaDiff(branch.diff, `${pointer}/${keyword}/${index}`)
        : []
    );
  });

export const collectTighteningsInSchemaDiff = (schemaDiff: unknown, pointer: string): string[] => {
  if (!isRecord(schemaDiff)) return [];
  return [
    ...rootTightenings(schemaDiff, pointer),
    ...propertyTightenings(schemaDiff, pointer),
    ...itemTightenings(schemaDiff, pointer),
    ...compositionTightenings(schemaDiff, pointer),
  ];
};
