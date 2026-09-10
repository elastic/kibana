/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fieldConstants } from '@kbn/discover-utils';
import type { LogDocumentOverview } from '@kbn/discover-utils';
import {
  getMessageFieldWithFallbacks,
  getLogExceptionTypeFieldWithFallback,
  getLogLevelFieldWithFallback,
  getLogEventTypeFieldWithFallback,
} from '@kbn/discover-utils';

export function hasErrorFields(formattedDoc: LogDocumentOverview): boolean {
  if (!hasErrorLevel(formattedDoc) && !hasErrorEventType(formattedDoc)) {
    return false;
  }

  const culpritValue = formattedDoc[fieldConstants.ERROR_CULPRIT_FIELD];
  const groupingNameValue = formattedDoc[fieldConstants.ERROR_GROUPING_NAME_FIELD];
  const { value: messageValue } = getMessageFieldWithFallbacks(formattedDoc);
  const { value: typeValue } = getLogExceptionTypeFieldWithFallback(formattedDoc);

  return Boolean(culpritValue || messageValue || typeValue || groupingNameValue);
}

function hasErrorLevel(formattedDoc: LogDocumentOverview): boolean {
  const { value: logLevelValue } = getLogLevelFieldWithFallback(formattedDoc);
  if (logLevelValue) {
    const logLevelStr = String(logLevelValue).toLowerCase();
    const isErrorLevel = ['error', 'fatal', 'critical', 'severe'].some((level) =>
      logLevelStr.includes(level)
    );

    return isErrorLevel;
  }
  return false;
}

function hasErrorEventType(formattedDoc: LogDocumentOverview): boolean {
  const { value: eventTypeValue } = getLogEventTypeFieldWithFallback(formattedDoc);
  if (eventTypeValue) {
    const eventTypeStr = String(eventTypeValue).toLowerCase();
    return eventTypeStr.includes('error') || eventTypeStr.includes('exception');
  }
  return false;
}
