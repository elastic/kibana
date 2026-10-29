/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function getCallsites(): NodeJS.CallSite[] {
  const prepare = Error.prepareStackTrace;
  try {
    let result: NodeJS.CallSite[] = [];
    Error.prepareStackTrace = (_, callSites) => {
      result = callSites.slice(1); // drop getCallsites' own frame
      return result;
    };
    void new Error().stack; // triggers prepareStackTrace
    return result;
  } finally {
    Error.prepareStackTrace = prepare;
  }
}
