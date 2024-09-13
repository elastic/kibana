/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEFAULT_CONTEXT = {
  options: {
    deletePrevious: false,
    resetOnCreation: true,
    errorOnFailedCleanup: false,
  },
  fields: {
    integrationName: '',
    datasets: [
      {
        type: 'logs' as const, // NOTE: Hardcoded to logs until we support multiple types via the UI.
        name: '',
      },
    ],
  },
  touchedFields: {
    integrationName: false,
    datasets: false,
  },
  errors: null,
};
