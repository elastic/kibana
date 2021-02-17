/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Take text from the model and present it to the user as a string
 * @param text model value
 * @returns {string}
 */
export function toUser(text: { [key: string]: any } | string | number): string {
  if (text == null) {
    return '';
  }
  if (typeof text === 'object') {
    if (text.query_string) {
      return toUser(text.query_string.query);
    }
    return JSON.stringify(text);
  }
  return '' + text;
}
