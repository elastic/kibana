/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const searchTerms = [
  'trace',
  'deb',
  'info',
  'not',
  'warn',
  'err',
  'cri',
  'sev',
  'ale',
  'emer',
  'fatal',
];

export const finalTerms = [
  'trace',
  'debug',
  'info',
  'notice',
  'warning',
  'error',
  'critical',
  'critical',
  'alert',
  'emergency',
  'fatal',
];

export const getLogLevelVariableCommand = (): string => {
  let evalPipe = `| EVAL log_level = CASE(`;
  for (const term of searchTerms) {
    evalPipe += `to_lower(log.level) LIKE "${term}*" , "${
      finalTerms[searchTerms.indexOf(term)]
    }", `;
  }
  evalPipe += `"Other")`;

  return evalPipe;
};
