/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { XJson } from '@kbn/es-ui-shared-plugin/public';
import type { RequestResult } from '../../application/hooks/use_send_current_request/send_request';
import { asArray } from './array_utils';

const { collapseLiteralStrings, expandLiteralStrings } = XJson;

export function textFromRequest(request: { method: string; url: string; data: string | string[] }) {
  const data = asArray(request.data).join('\n');
  return request.method + ' ' + request.url + '\n' + data;
}

export function jsonToString(data: object, indent: boolean) {
  return JSON.stringify(data, null, indent ? 2 : 0);
}

export function formatRequestBodyDoc(data: string[], indent: boolean) {
  let changed = false;
  const formattedData = [];
  for (let i = 0; i < data.length; i++) {
    const curDoc = data[i];
    try {
      let newDoc = jsonToString(JSON.parse(collapseLiteralStrings(curDoc)), indent);
      if (indent) {
        newDoc = expandLiteralStrings(newDoc);
      }
      changed = changed || newDoc !== curDoc;
      formattedData.push(newDoc);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
      formattedData.push(curDoc);
    }
  }

  return {
    changed,
    data: formattedData,
  };
}

export function extractWarningMessages(warnings: string) {
  // pattern for valid warning header
  const re =
    /\d{3} [0-9a-zA-Z!#$%&'*+-.^_`|~]+ \"((?:\t| |!|[\x23-\x5b]|[\x5d-\x7e]|[\x80-\xff]|\\\\|\\")*)\"(?: \"[^"]*\")?/;
  // split on any comma that is followed by an even number of quotes
  return _.map(splitOnUnquotedCommaSpace(warnings), (warning) => {
    const match = re.exec(warning);
    // extract the actual warning if there was a match
    return '#! ' + (match !== null ? unescape(match[1]) : warning);
  });
}

// To avoid double unescaping, the best approach is to process the backslash escape sequence last.
// This ensures that any escaped characters are correctly handled first, preventing premature
// interpretation of the backslash itself as part of another escape sequence.
export function unescape(s: string) {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

export function splitOnUnquotedCommaSpace(s: string) {
  let quoted = false;
  const arr = [];
  let buffer = '';
  let i = 0;
  while (i < s.length) {
    let token = s.charAt(i++);
    if (token === '\\' && i < s.length) {
      token += s.charAt(i++);
    } else if (token === ',' && i < s.length && s.charAt(i) === ' ') {
      token += s.charAt(i++);
    }
    if (token === '"') {
      quoted = !quoted;
    } else if (!quoted && token === ', ') {
      arr.push(buffer);
      buffer = '';
      continue;
    }
    buffer += token;
  }
  arr.push(buffer);
  return arr;
}

/**
 * Normalizes a URL string using the URL constructor so that comparisons
 * are insensitive to trailing-slash differences and other minor formatting
 * variations (e.g. default-port elision). Returns the original string when
 * it cannot be parsed as a URL.
 */
export function normalizeUrl(url: string): string {
  try {
    return new URL(url).toString();
  } catch {
    return url;
  }
}

/**
 *  Sorts the request data by statusCode in increasing order and
 *  returns the last one which will be rendered in network request status bar
 */
export const getResponseWithMostSevereStatusCode = (
  requestData: RequestResult[] | null | undefined
) => {
  if (requestData) {
    return requestData
      .slice()
      .sort((a, b) => a.response.statusCode - b.response.statusCode)
      .pop();
  }
};
