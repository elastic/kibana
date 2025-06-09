/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const transformTimeProperties = (
  attributes: object
): { timeFrom?: string; timeTo?: string; timeRestore?: boolean } => {
  return {
    ...('timeFrom' in attributes &&
      typeof attributes.timeFrom === 'string' && { timeFrom: attributes.timeFrom }),
    ...('timeTo' in attributes &&
      typeof attributes.timeTo === 'string' && { timeTo: attributes.timeTo }),
    timeRestore:
      'timeRestore' in attributes && typeof attributes.timeRestore === 'boolean'
        ? attributes.timeRestore
        : false,
  };
};
