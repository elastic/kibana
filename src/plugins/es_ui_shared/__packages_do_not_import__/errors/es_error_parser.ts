/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

interface ParsedError {
  message: string;
  cause: string[];
}

const getCause = (obj: any = {}, causes: string[] = []): string[] => {
  const updated = [...causes];

  if (obj.caused_by) {
    updated.push(obj.caused_by.reason);

    // Recursively find all the "caused by" reasons
    return getCause(obj.caused_by, updated);
  }

  return updated.filter(Boolean);
};

export const parseEsError = (err: string): ParsedError => {
  try {
    const { error } = JSON.parse(err);
    const cause = getCause(error);
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
