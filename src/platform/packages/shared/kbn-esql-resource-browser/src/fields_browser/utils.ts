/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const getFieldTypeLabel = (type: string): string => {
  const typeLower = type.toLowerCase();
  if (typeLower.includes('date') || typeLower.includes('time')) return 'Date';
  if (
    typeLower.includes('number') ||
    typeLower.includes('long') ||
    typeLower.includes('double') ||
    typeLower.includes('integer')
  )
    return 'Number';
  if (typeLower.includes('ip')) return 'IP address';
  if (typeLower.includes('geo')) return 'Geo point';
  if (typeLower.includes('keyword')) return 'Keyword';
  if (typeLower.includes('text')) return 'Text';
  return type;
};

export const getFieldTypeIconType = (typeLabel: string): string => {
  const typeLower = typeLabel.toLowerCase();
  if (typeLower.includes('date') || typeLower.includes('time')) return 'date';
  if (typeLower.includes('number')) return 'number';
  if (typeLower.includes('ip')) return 'ip';
  if (typeLower.includes('geo')) return 'geo_point';
  if (typeLower.includes('keyword')) return 'keyword';
  if (typeLower.includes('text')) return 'text';
  return 'text';
};
