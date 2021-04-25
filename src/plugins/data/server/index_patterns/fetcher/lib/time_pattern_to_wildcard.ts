/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 *  Convert a moment time pattern to an index wildcard
 *  by extracting all of the "plain text" component and
 *  replacing all moment pattern components with "*"
 *
 *  @param  {String} timePattern
 *  @return {String}
 */
export function timePatternToWildcard(timePattern: string) {
  let wildcard = '';
  let inEscape = false;
  let inPattern = false;

  for (let i = 0; i < timePattern.length; i++) {
    const ch = timePattern.charAt(i);
    switch (ch) {
      case '[':
        inPattern = false;
        if (!inEscape) {
          inEscape = true;
        } else {
          wildcard += ch;
        }
        break;
      case ']':
        if (inEscape) {
          inEscape = false;
        } else if (!inPattern) {
          wildcard += ch;
        }
        break;
      default:
        if (inEscape) {
          wildcard += ch;
        } else if (!inPattern) {
          wildcard += '*';
          inPattern = true;
        }
    }
  }

  return wildcard;
}
