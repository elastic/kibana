/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';

const utils = {};

utils.textFromRequest = function(request) {
  let data = request.data;
  if (typeof data !== 'string') {
    data = data.join('\n');
  }
  return request.method + ' ' + request.url + '\n' + data;
};

utils.jsonToString = function(data, indent) {
  return JSON.stringify(data, null, indent ? 2 : 0);
};

utils.reformatData = function(data, indent) {
  let changed = false;
  const formattedData = [];
  for (let i = 0; i < data.length; i++) {
    const curDoc = data[i];
    try {
      let newDoc = utils.jsonToString(
        JSON.parse(utils.collapseLiteralStrings(curDoc)),
        indent ? 2 : 0
      );
      if (indent) {
        newDoc = utils.expandLiteralStrings(newDoc);
      }
      changed = changed || newDoc !== curDoc;
      formattedData.push(newDoc);
    } catch (e) {
      console.log(e);
      formattedData.push(curDoc);
    }
  }

  return {
    changed: changed,
    data: formattedData,
  };
};

utils.collapseLiteralStrings = function(data) {
  const splitData = data.split(`"""`);
  for (let idx = 1; idx < splitData.length - 1; idx += 2) {
    splitData[idx] = JSON.stringify(splitData[idx]);
  }
  return splitData.join('');
};

/*
  The following regex describes global match on:
  1. one colon followed by any number of space characters
  2. one double quote (not escaped, special case for JSON in JSON).
  3. greedily match any non double quote and non newline char OR any escaped double quote char (non-capturing).
  4. handle a special case where an escaped slash may be the last character
  5. one double quote

  For instance: `: "some characters \" here"`
  Will match and be expanded to: `"""some characters " here"""`

 */

const LITERAL_STRING_CANDIDATES = /((:[\s\r\n]*)([^\\])"(\\"|[^"\n])*\\?")/g;

utils.expandLiteralStrings = function(data) {
  return data.replace(LITERAL_STRING_CANDIDATES, function(match, string) {
    // Expand to triple quotes if there are _any_ slashes
    if (string.match(/\\./)) {
      const firstDoubleQuoteIdx = string.indexOf('"');
      const colonAndAnySpacing = string.slice(0, firstDoubleQuoteIdx);
      const rawStringifiedValue = string.slice(firstDoubleQuoteIdx, string.length);
      const jsonValue = JSON.parse(rawStringifiedValue)
        .replace('^s*\n', '')
        .replace('\ns*^', '');
      return `${colonAndAnySpacing}"""${jsonValue}"""`;
    } else {
      return string;
    }
  });
};

utils.extractDeprecationMessages = function(warnings) {
  // pattern for valid warning header
  const re = /\d{3} [0-9a-zA-Z!#$%&'*+-.^_`|~]+ \"((?:\t| |!|[\x23-\x5b]|[\x5d-\x7e]|[\x80-\xff]|\\\\|\\")*)\"(?: \"[^"]*\")?/;
  // split on any comma that is followed by an even number of quotes
  return _.map(utils.splitOnUnquotedCommaSpace(warnings), function(warning) {
    const match = re.exec(warning);
    // extract the actual warning if there was a match
    return '#! Deprecation: ' + (match !== null ? utils.unescape(match[1]) : warning);
  });
};

utils.unescape = function(s) {
  return s.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
};

utils.splitOnUnquotedCommaSpace = function(s) {
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
};

export default utils;
