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
import type {
  RequestArgs,
  RequestResult,
} from '../../application/hooks/use_send_current_request/send_request';
import type { DevToolsVariable } from '../../application/components';

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

// Regular expression to match different types of comments:
// - Block comments, single and multiline (/* ... */)
// - Single-line comments (// ...)
// - Hash comments (# ...)
export function hasComments(data: string) {
  /*
    1. (\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)
       - (\/\*): Matches the start of a block comment
       - [^*]*: Matches any number of characters that are NOT an asterisk (*), to avoid prematurely closing the comment.
       - \*+: Matches one or more asterisks (*), which is part of the block comment closing syntax.
       - (?:[^/*][^*]*\*+)*: This non-capturing group ensures that any characters between asterisks and slashes are correctly matched and prevents mismatching on nested or unclosed comments.
       - \*\/: Matches the closing of a block comment

    2. (\/\/.*)
       - Matches single-line comments starting with '//'.
       - .*: Matches any characters that follow until the end of the line.

    3. (#.*)
       - Matches single-line comments starting with a hash (#).
       - .*: Matches any characters that follow until the end of the line.
   */
  const re = /(\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)|(\/\/.*)|(#.*)/;
  return re.test(data);
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
export const getResponseWithMostSevereStatusCode = (requestData: RequestResult[] | null) => {
  if (requestData) {
    return requestData
      .slice()
      .sort((a, b) => a.response.statusCode - b.response.statusCode)
      .pop();
  }
};

export const replaceVariables = (
  requests: RequestArgs['requests'],
  variables: DevToolsVariable[]
) => {
  const urlRegex = /\${(\w+)}/g;

  // The forward part '([\\"]?)"' of regex matches '\\"', '""', and '"', but the only
  // last match is preferable. The unwanted ones can be filtered out by checking whether
  // the first capturing group is empty. This functionality is identical to the one
  // achievable by negative lookbehind assertion - i.e. '(?<![\\"])"'
  const bodyRegexSingleQuote = /([\\"]?)"\${(\w+)}"(?!")/g;
  const bodyRegexTripleQuotes = /([\\"]?)"""\${(\w+)}"""(?!")/g;

  return requests.map((req) => {
    // safeguard - caller passes any[] from editor's getRequestsInRange() as requests
    if (!req || !req.url || !req.data) {
      return req;
    }

    if (urlRegex.test(req.url)) {
      req.url = req.url.replaceAll(urlRegex, (match, key) => {
        const variable = variables.find(({ name }) => name === key);

        return variable?.value ?? match;
      });
    }

    req.data = req.data.map((data) => {
      if (bodyRegexSingleQuote.test(data)) {
        data = data.replaceAll(bodyRegexSingleQuote, (match, lookbehind, key) => {
          const variable = variables.find(({ name }) => name === key);

          if (!lookbehind && variable) {
            // All values must be stringified to send a successful request to ES.
            const { value } = variable;

            const isStringifiedObject = value.startsWith('{') && value.endsWith('}');
            if (isStringifiedObject) {
              return value;
            }

            const isStringifiedNumber = !isNaN(parseFloat(value));
            // We need to check uuids as well, since they are also numbers.
            if (isStringifiedNumber && !isUUID(value)) {
              return value;
            }

            const isStringifiedArray = value.startsWith('[') && value.endsWith(']');
            if (isStringifiedArray) {
              return value;
            }

            const isStringifiedBool = value === 'true' || value === 'false';
            if (isStringifiedBool) {
              return value;
            }

            // At this point the value must be an unstringified string, so we have to stringify it.
            // Example: 'stringValue' -> '"stringValue"'
            return JSON.stringify(value);
          }

          return match;
        });
      }

      if (bodyRegexTripleQuotes.test(data)) {
        data = data.replaceAll(bodyRegexTripleQuotes, (match, lookbehind, key) => {
          const variable = variables.find(({ name }) => name === key);

          return !lookbehind && variable?.value
            ? '""' + JSON.stringify(variable?.value) + '""'
            : match;
        });
      }

      return data;
    });

    return req;
  });
};

const isUUID = (val: string) => {
  return (
    typeof val === 'string' &&
    val.match(/[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/)
  );
};
