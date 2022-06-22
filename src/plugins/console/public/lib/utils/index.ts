/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { XJson } from '@kbn/es-ui-shared-plugin/public';

const { collapseLiteralStrings, expandLiteralStrings } = XJson;

export function textFromRequest(request: { method: string; url: string; data: string | string[] }) {
  let data = request.data;
  if (typeof data !== 'string') {
    data = data.join('\n');
  }
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

export function unescape(s: string) {
  return s.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
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
