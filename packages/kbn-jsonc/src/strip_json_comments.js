/* eslint-disable @kbn/eslint/require-license-header */

/**
 * @notice
 *
 * Vendored copy of `strip-json-comments` so that we can use it when npm modules are not available.
 * https://github.com/sindresorhus/strip-json-comments/tree/34b79cb0f1129aa85ef4b5c3292e8bc546984ef9
 *
 * MIT License
 *
 * Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const singleComment = Symbol('singleComment');
const multiComment = Symbol('multiComment');

const stripWithoutWhitespace = () => '';

/**
 * @param {string} string
 * @param {number | undefined} start
 * @param {number | undefined} end
 */
const stripWithWhitespace = (string, start = undefined, end = undefined) =>
  string.slice(start, end).replace(/\S/g, ' ');

/**
 * @param {string} jsonString
 * @param {number} quotePosition
 */
const isEscaped = (jsonString, quotePosition) => {
  let index = quotePosition - 1;
  let backslashCount = 0;

  while (jsonString[index] === '\\') {
    index -= 1;
    backslashCount += 1;
  }

  return Boolean(backslashCount % 2);
};

/**
 * @param {string} jsonString
 * @param {{ whitespace?: boolean; trailingCommas?: boolean }} options
 */
function stripJsonComments(jsonString, { whitespace = true, trailingCommas = false } = {}) {
  if (typeof jsonString !== 'string') {
    throw new TypeError(
      `Expected argument \`jsonString\` to be a \`string\`, got \`${typeof jsonString}\``
    );
  }

  const strip = whitespace ? stripWithWhitespace : stripWithoutWhitespace;

  let isInsideString = false;
  /** @type {boolean | symbol} */
  let isInsideComment = false;
  let offset = 0;
  let buffer = '';
  let result = '';
  let commaIndex = -1;

  for (let index = 0; index < jsonString.length; index++) {
    const currentCharacter = jsonString[index];
    const nextCharacter = jsonString[index + 1];

    if (!isInsideComment && currentCharacter === '"') {
      // Enter or exit string
      const escaped = isEscaped(jsonString, index);
      if (!escaped) {
        isInsideString = !isInsideString;
      }
    }

    if (isInsideString) {
      continue;
    }

    if (!isInsideComment && currentCharacter + nextCharacter === '//') {
      // Enter single-line comment
      buffer += jsonString.slice(offset, index);
      offset = index;
      isInsideComment = singleComment;
      index++;
    } else if (isInsideComment === singleComment && currentCharacter + nextCharacter === '\r\n') {
      // Exit single-line comment via \r\n
      index++;
      isInsideComment = false;
      buffer += strip(jsonString, offset, index);
      offset = index;
      continue;
    } else if (isInsideComment === singleComment && currentCharacter === '\n') {
      // Exit single-line comment via \n
      isInsideComment = false;
      buffer += strip(jsonString, offset, index);
      offset = index;
    } else if (!isInsideComment && currentCharacter + nextCharacter === '/*') {
      // Enter multiline comment
      buffer += jsonString.slice(offset, index);
      offset = index;
      isInsideComment = multiComment;
      index++;
      continue;
    } else if (isInsideComment === multiComment && currentCharacter + nextCharacter === '*/') {
      // Exit multiline comment
      index++;
      isInsideComment = false;
      buffer += strip(jsonString, offset, index + 1);
      offset = index + 1;
      continue;
    } else if (trailingCommas && !isInsideComment) {
      if (commaIndex !== -1) {
        if (currentCharacter === '}' || currentCharacter === ']') {
          // Strip trailing comma
          buffer += jsonString.slice(offset, index);
          result += strip(buffer, 0, 1) + buffer.slice(1);
          buffer = '';
          offset = index;
          commaIndex = -1;
        } else if (
          currentCharacter !== ' ' &&
          currentCharacter !== '\t' &&
          currentCharacter !== '\r' &&
          currentCharacter !== '\n'
        ) {
          // Hit non-whitespace following a comma; comma is not trailing
          buffer += jsonString.slice(offset, index);
          offset = index;
          commaIndex = -1;
        }
      } else if (currentCharacter === ',') {
        // Flush buffer prior to this point, and save new comma index
        result += buffer + jsonString.slice(offset, index);
        buffer = '';
        offset = index;
        commaIndex = index;
      }
    }
  }

  return (
    result + buffer + (isInsideComment ? strip(jsonString.slice(offset)) : jsonString.slice(offset))
  );
}

module.exports = { stripJsonComments };
