/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  ampersandRegex,
  digitRegex,
  equalsSignRegex,
  newLineRegex,
  numberStartRegex,
  questionMarkRegex,
  slashRegex,
  whitespacesRegex,
} from './constants';

/*
 * This function parses a line with the method and url.
 * The url is parsed into path and params, each parsed into tokens.
 * Returns method, urlPathTokens and urlParamsTokens which are arrays of strings.
 */
export const parseLine = (line: string): ParsedLineTokens => {
  // try to parse into method and url (split on whitespace)
  const parts = line.split(whitespacesRegex);
  // 1st part is the method
  const method = parts[0].toUpperCase();
  // 2nd part is the url
  const url = parts[1];
  // try to parse into url path and url params (split on question mark)
  const { urlPathTokens, urlParamsTokens } = parseUrl(url);
  return { method, urlPathTokens, urlParamsTokens };
};

/*
 * This function parses an url into path and params, each parsed into tokens.
 * Returns urlPathTokens and urlParamsTokens which are arrays of strings.
 */
export const parseUrl = (
  url: string
): {
  urlPathTokens: ParsedLineTokens['urlPathTokens'];
  urlParamsTokens: ParsedLineTokens['urlParamsTokens'];
} => {
  let urlPathTokens: ParsedLineTokens['urlPathTokens'] = [];
  let urlParamsTokens: ParsedLineTokens['urlParamsTokens'] = [];
  const urlParts = url.split(questionMarkRegex);
  // 1st part is the url path
  const urlPath = urlParts[0];
  // try to parse into url path tokens (split on slash)
  if (urlPath) {
    urlPathTokens = urlPath.split(slashRegex);
  }
  // 2nd part is the url params
  const urlParams = urlParts[1];
  // try to parse into url param tokens
  if (urlParams) {
    urlParamsTokens = urlParams.split(ampersandRegex).map((urlParamsPart) => {
      return urlParamsPart.split(equalsSignRegex);
    });
  }
  return { urlPathTokens, urlParamsTokens };
};

/*
 * This function parses the body of the request into tokens.
 * For example '{ "test": [' -> ['{', 'test', '[']. This array is used for autocomplete.
 * Returns array of strings representing body tokens for autocomplete.
 */
export const parseBody = (value: string): string[] => {
  let currentToken = '';
  const tokens = [];
  let index = 0;
  let char = value.charAt(index);
  const next = () => {
    index++;
    char = value.charAt(index);
  };
  const peek = (offset: number): string => {
    return value.charAt(index + offset);
  };
  const skipWhitespace = () => {
    while (whitespacesRegex.test(char)) {
      next();
    }
  };
  const skipUntilAfterNewLine = () => {
    while (char && !isNewLine(char)) {
      next();
    }
    // skip the new line
    if (isNewLine(char)) {
      next();
    }
  };
  const skipComments = () => {
    // # comment
    if (isHashChar(char)) {
      // first skip #
      next();
      skipUntilAfterNewLine();
    } else if (
      // // comment
      isSlash(char) &&
      isSlash(peek(1))
    ) {
      // first skip //
      next();
      next();
      skipUntilAfterNewLine();
    } else if (
      // multi line comment starting with /*
      isSlash(char) &&
      isStar(peek(1))
    ) {
      next();
      next();
      // skip until closing */ is found
      while (char && !(isStar(char) && isSlash(peek(1)))) {
        next();
      }
      if (isStar(char) && isSlash(peek(1))) {
        next();
        next();
      } else {
        throw new Error('Not able to parse multi-line comment');
      }
    }
  };
  const parseString = () => {
    // first check if it's a triple quote
    if (isTripleQuote(char, peek(1), peek(2))) {
      // skip the opening triple quote
      next();
      next();
      next();
      // skip to the next triple quote
      while (char && !isTripleQuote(char, peek(1), peek(2))) {
        next();
      }
      if (isTripleQuote(char, peek(1), peek(2))) {
        // skip the closing triple quote
        next();
        next();
        next();
      } else {
        throw new Error('Missing closing triple quote');
      }
    } else if (isDoubleQuote(char)) {
      // skip the opening double quote
      next();
      while (char && !isDoubleQuote(char)) {
        next();
      }
      if (isDoubleQuote(char)) {
        // skip the closing double quote
        next();
      } else {
        throw new Error('Missing closing double quote');
      }
    } else {
      throw new Error('Not able to parse as string');
    }
  };
  const parseNumber = () => {
    // check the first char
    if (!isNumberStartChar(char)) {
      throw new Error('Not able to parse as number');
    }
    if (isMinusSign(char)) {
      next();
    }
    // check that there is at least 1 digit
    if (!isDigit(char)) {
      throw new Error('Not able to parse as number');
    }
    // skip digits
    while (isDigit(char)) {
      next();
    }
    // optionally there is a dot
    if (isDot(char)) {
      next();
      // needs at least 1 digit after the dot
      if (!isDigit(char)) {
        throw new Error('Missing digits after a dot');
      }
      while (isDigit(char)) {
        next();
      }
    }
    // optionally there is E notation
    if (isENotation(char)) {
      next();
      // needs at least 1 digit after e or E
      if (!isDigit(char)) {
        throw new Error('Missing digits after E notation');
      }
      while (isDigit(char)) {
        next();
      }
    }
    // number parsing is complete
  };
  const parseKeyword = () => {
    switch (char) {
      case 'n': {
        if (peek(1) === 'u' && peek(2) === 'l' && peek(3) === 'l') {
          next();
          next();
          next();
          next();
        } else {
          throw new Error('Not able to parse as null');
        }
        break;
      }
      case 't': {
        if (peek(1) === 'r' && peek(2) === 'u' && peek(3) === 'e') {
          next();
          next();
          next();
          next();
        } else {
          throw new Error('Not able to parse as true');
        }
        break;
      }
      case 'f': {
        if (peek(1) === 'a' && peek(2) === 'l' && peek(3) === 's' && peek(4) === 'e') {
          next();
          next();
          next();
          next();
          next();
        } else {
          throw new Error('Not able to parse as false');
        }
        break;
      }
      default: {
        throw new Error('Not able to parse as null, true or false');
      }
    }
  };
  const parsePropertyName = () => {
    if (!isDoubleQuote(char)) {
      throw new Error('Missing " at the start of string');
    }
    next();
    let propertyName = '';
    while (char && !isDoubleQuote(char)) {
      propertyName = propertyName + char;
      next();
    }
    if (!isDoubleQuote(char)) {
      throw new Error('Missing " at the end of string');
    }
    next();
    if (!propertyName) {
      throw new Error('Empty string used as property name');
    }
    return propertyName;
  };

  try {
    while (char) {
      // the value in currentToken determines the state of the parser
      if (!currentToken) {
        // the start of the object
        skipWhitespace();
        skipComments();
        // look for opening curly bracket
        if (char === '{') {
          tokens.push(char);
          currentToken = char;
          next();
        } else {
          throw new Error('Missing { at object start');
        }
      } else if (
        // inside an object
        currentToken === '{'
      ) {
        skipWhitespace();
        skipComments();
        // inspect the current char
        if (isDoubleQuote(char)) {
          // property name: parse the string and add to tokens
          const propertyName = parsePropertyName();
          // allow whitespace
          skipWhitespace();
          // expecting a colon, otherwise the parser fails
          if (!isColon(char)) {
            throw new Error('Not able to parse');
          }
          // add the property name to the tokens
          tokens.push(propertyName);
          currentToken = propertyName;
          next();
        } else if (char === '}') {
          // empty object: remove the corresponding opening { from tokens
          tokens.pop();
          currentToken = tokens[tokens.length - 1];
          next();

          skipWhitespace();
          // check if the empty object was used as a property value
          if (isPropertyName(currentToken)) {
            // the empty object was the value for this property name, remove it from tokens
            tokens.pop();
            currentToken = tokens[tokens.length - 1];
          }
        } else if (isComma(char)) {
          // ignore the comma
          next();
        } else {
          throw new Error('Not able to parse');
        }
      } else if (
        // inside an array
        currentToken === '['
      ) {
        skipWhitespace();
        skipComments();

        // inspect the current char
        if (char === ']') {
          // an empty array
          tokens.pop();
          currentToken = tokens[tokens.length - 1];
          next();

          skipWhitespace();
          // check if empty array was used as a property value
          if (isPropertyName(currentToken)) {
            // the empty array was the value for this property name, remove it from tokens
            tokens.pop();
            currentToken = tokens[tokens.length - 1];
          }
        } else if (isComma(char)) {
          // ignore the comma
          next();
        } else {
          // parsing array items

          // object or array: add to tokens
          if (char === '{' || char === '[') {
            tokens.push(char);
            currentToken = char;
            next();
          } else {
            // simple values
            if (isDoubleQuote(char)) {
              parseString();
            } else if (isNumberStartChar(char)) {
              parseNumber();
            } else if (isKeywordChar(char)) {
              parseKeyword();
            } else {
              throw new Error('Not able to parse');
            }
          }
        }
      } else if (
        // parsing property value after a property name was found
        isPropertyName(currentToken)
      ) {
        skipWhitespace();
        skipComments();
        if (char === '{' || char === '[') {
          // nested object or array
          tokens.push(char);
          currentToken = char;
          next();
        } else {
          // simple values
          if (isDoubleQuote(char)) {
            parseString();
          } else if (isNumberStartChar(char)) {
            parseNumber();
          } else if (isKeywordChar(char)) {
            parseKeyword();
          } else {
            throw new Error('Not able to parse');
          }
          // after parsing a simple value, this property name is parsed and can be removed from tokens
          tokens.pop();
          currentToken = tokens[tokens.length - 1];
        }
      } else {
        throw new Error('Not able to parse');
      }
    }
    return tokens;
  } catch (e) {
    return tokens;
  }
};

/*
 * This functions removes any trailing inline comments, for example
 * "_search // comment" -> "_search"
 * Ideally the parser would do that, but currently they are included in url.
 */
export const removeTrailingWhitespaces = (url: string): string => {
  return url.trim().split(whitespacesRegex)[0];
};

/*
 * This function splits a string on whitespaces and returns its parts as an array.
 */
export const getLineTokens = (lineContent: string): string[] => {
  return lineContent.split(whitespacesRegex);
};

/*
 * This function checks if the url contains url params.
 */
export const containsUrlParams = (lineContent: string): boolean => {
  return questionMarkRegex.test(lineContent);
};

/*
 * Internal helpers
 */
interface ParsedLineTokens {
  method: string;
  urlPathTokens: string[];
  urlParamsTokens: string[][];
}

const isNewLine = (char: string): boolean => {
  return newLineRegex.test(char);
};
const isDoubleQuote = (char: string): boolean => {
  return char === '"';
};
const isColon = (char: string): boolean => {
  return char === ':';
};
const isComma = (char: string): boolean => {
  return char === ',';
};
const isHashChar = (char: string): boolean => {
  return char === '#';
};
const isSlash = (char: string): boolean => {
  return char === '/';
};
const isStar = (char: string): boolean => {
  return char === '*';
};
const isPropertyName = (token: string): boolean => {
  // we only have {, [ or property name in tokens
  return token !== '{' && token !== '[';
};
const isTripleQuote = (char1: string, char2: string, char3: string): boolean => {
  return isDoubleQuote(char1) && isDoubleQuote(char2) && isDoubleQuote(char3);
};
const isNumberStartChar = (char: string): boolean => {
  return numberStartRegex.test(char);
};
const isMinusSign = (char: string): boolean => {
  return char === '-';
};
const isDigit = (char: string): boolean => {
  return digitRegex.test(char);
};
const isDot = (char: string): boolean => {
  return char === '.';
};
const isENotation = (char: string): boolean => {
  return char === 'e' || char === 'E';
};
const isKeywordChar = (char: string): boolean => {
  // null, true or false
  return char === 'n' || char === 't' || char === 'f';
};
