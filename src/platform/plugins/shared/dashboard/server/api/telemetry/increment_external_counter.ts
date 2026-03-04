/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const sanitizeCounterKeyPart = (text: string): string => {
  let sanitized = String(text).replace(/[^a-zA-Z0-9_-]/g, '_');
  sanitized = sanitized.replace(/_+/g, '_');
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  const maxLength = 100;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  if (!sanitized) {
    sanitized = 'unknown';
  }

  return sanitized.toLowerCase();
};

export const counterNames = {
  external: (endpoint: 'create' | 'read' | 'update' | 'delete' | 'search') =>
    `external_${endpoint}`,
  externalReadStrippedPanelsTotal: () => 'external_read_stripped_panels_total',
  externalReadStrippedPanelsByType: (panelType: string) =>
    `external_read_stripped_panels_type_${sanitizeCounterKeyPart(panelType)}`,
  externalCreateRejectedUnmappedPanelsTotal: () => 'external_create_rejected_unmapped_panels_total',
  externalCreateRejectedUnmappedPanelsByType: (panelType: string) =>
    `external_create_rejected_unmapped_panels_type_${sanitizeCounterKeyPart(panelType)}`,
  externalUpdateRejectedUnmappedPanelsTotal: () => 'external_update_rejected_unmapped_panels_total',
  externalUpdateRejectedUnmappedPanelsByType: (panelType: string) =>
    `external_update_rejected_unmapped_panels_type_${sanitizeCounterKeyPart(panelType)}`,
} as const;
