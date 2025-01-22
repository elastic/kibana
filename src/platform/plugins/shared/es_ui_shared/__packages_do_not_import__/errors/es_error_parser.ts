/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

interface ParsedError {
  message: string;
  cause: string[];
}

export const getEsCause = (obj: any = {}, causes: string[] = []): string[] => {
  const updated = [...causes];

  if (obj.caused_by) {
    updated.push(obj.caused_by.reason);

    // Recursively find all the "caused by" reasons
    return getEsCause(obj.caused_by, updated);
  }

  return updated.filter(Boolean);
};

export const parseEsError = (err: string): ParsedError => {
  try {
    const { error } = JSON.parse(err);
    const cause = getEsCause(error);
    return {
      message: error.reason,
      cause,
    };
  } catch (e) {
    return {
      message: err,
      cause: [],
    };
  }
};
