/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function escapeColumn(column: string) {
  return `\`${column}\``;
}

export const formatValue = (value: any) => {
  return typeof value === 'string' ? `"${value}"` : value;
};

export const formatColumn = (column: string) => {
  return column.startsWith('??') ? column : escapeColumn(column);
};
