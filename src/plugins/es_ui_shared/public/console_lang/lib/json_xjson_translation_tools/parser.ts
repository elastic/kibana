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

type StringValues = Array<{ startIndex: number; endIndex: number }>;

interface ParseResult {
  stringValues: StringValues;
}

interface ParseOptions {
  assumeValidJson?: boolean;
}

const JSON_COLON = ':';
const JSON_STRING_DELIMITER = '"';
const JSON_STRING_ESCAPE = '\\';

export const extractJSONStringValues = (
  input: string,
  { assumeValidJson = true }: ParseOptions = {}
): ParseResult => {
  if (!assumeValidJson) {
    JSON.parse(input);
  }

  let position = 0;
  let currentStringStartPos: number;
  let isInsideString = false;
  const stringValues: StringValues = [];

  function read() {
    return input[position];
  }

  function peekNextNonWhitespace(): string | undefined {
    let peekPosition = position + 1;

    while (peekPosition < input.length) {
      const peekChar = input[peekPosition];
      if (peekChar.match(/[^\s\r\n]/)) {
        return peekChar;
      }
      ++peekPosition;
    }
  }

  function eat() {
    ++position;
  }

  while (position < input.length) {
    const char = read();
    if (!isInsideString) {
      if (char === JSON_STRING_DELIMITER) {
        currentStringStartPos = position;
        isInsideString = true;
      }
    } else {
      if (char === JSON_STRING_ESCAPE) {
        // skip ahead - we are still inside of a string
        eat();
      } else if (char === JSON_STRING_DELIMITER) {
        if (peekNextNonWhitespace() !== JSON_COLON) {
          stringValues.push({
            startIndex: currentStringStartPos!,
            endIndex: position,
          });
        }
        isInsideString = false;
      }
    }
    eat();
  }

  return { stringValues };
};
