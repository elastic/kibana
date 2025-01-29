/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';

export function formatSessionName(
  sessionName: string,
  opts: { sessionStartTime?: Date; appendStartTime?: boolean }
): string {
  if (opts.sessionStartTime && opts.appendStartTime) {
    sessionName = appendDate(sessionName, opts.sessionStartTime);
  }

  return sessionName;
}

function appendDate(sessionName: string, sessionStartTime: Date): string {
  return `${sessionName} - ${moment(sessionStartTime).format(`L @ LT`)}`;
}
