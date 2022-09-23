/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

export function hasComments(data: string) {
  // matches single line and multiline comments
  const re = /(\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\/)|(\/\/.*)|(#.*)/;
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
  const urlRegex = /(\${\w+})/g;
  const bodyRegex = /("\${\w+}")/g;
  return requests.map((req) => {
    if (urlRegex.test(req.url)) {
      req.url = req.url.replaceAll(urlRegex, (match) => {
        // Sanitize variable name
        const key = match.replace('${', '').replace('}', '');
        const variable = variables.find(({ name }) => name === key);

        return variable?.value ?? match;
      });
    }

    if (req.data && req.data.length) {
      if (bodyRegex.test(req.data[0])) {
        const data = req.data[0].replaceAll(bodyRegex, (match) => {
          // Sanitize variable name
          const key = match.replace('"${', '').replace('}"', '');
          const variable = variables.find(({ name }) => name === key);

          if (variable) {
            // All values must be stringified to send a successful request to ES.
            const { value } = variable;

            const isStringifiedObject = value.startsWith('{') && value.endsWith('}');
            if (isStringifiedObject) {
              return value;
            }

            const isStringifiedNumber = !isNaN(parseFloat(value));
            if (isStringifiedNumber) {
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
        req.data = [data];
      }
    }

    return req;
  });
};
