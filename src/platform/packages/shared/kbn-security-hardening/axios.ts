/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';

export function getSanitizedError(error: Error) {
  const sanitizedError = new Error(error.message, {
    cause: error.cause,
  });
  sanitizedError.name = error.name;
  sanitizedError.stack = error.stack;
  return sanitizedError;
}

axios.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(getSanitizedError(error))
);

axios.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(getSanitizedError(error))
);
