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

export function collapseLiteralStrings(data: string) {
  const splitData = data.split(`"""`);
  for (let idx = 1; idx < splitData.length - 1; idx += 2) {
    splitData[idx] = JSON.stringify(splitData[idx]);
  }
  return splitData.join('');
}

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

export function expandLiteralStrings(data: string) {
  return data.replace(LITERAL_STRING_CANDIDATES, (match, string) => {
    // Expand to triple quotes if there are _any_ slashes
    if (string.match(/\\./)) {
      const firstDoubleQuoteIdx = string.indexOf('"');
      const lastDoubleQuoteIdx = string.lastIndexOf('"');

      // Handle a special case where we may have a value like "\"test\"". We don't
      // want to expand this to """"test"""" - so we terminate before processing the string
      // further if we detect this either at the start or end of the double quote section.

      if (string[firstDoubleQuoteIdx + 1] === '\\' && string[firstDoubleQuoteIdx + 2] === '"') {
        return string;
      }

      if (string[lastDoubleQuoteIdx - 1] === '"' && string[lastDoubleQuoteIdx - 2] === '\\') {
        return string;
      }

      const colonAndAnySpacing = string.slice(0, firstDoubleQuoteIdx);
      const rawStringifiedValue = string.slice(firstDoubleQuoteIdx, string.length);
      // Remove one level of JSON stringification
      const jsonValue = JSON.parse(rawStringifiedValue);
      return `${colonAndAnySpacing}"""${jsonValue}"""`;
    } else {
      return string;
    }
  });
}
