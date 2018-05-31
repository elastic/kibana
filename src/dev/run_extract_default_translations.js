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

import fs from 'fs';
import glob from 'glob';
import { resolve as resolvePath } from 'path';
import { jsdom } from 'jsdom';
import { parse } from '@babel/parser';
import traverse from 'babel-traverse';
import * as babelTypes from 'babel-types';
import { promisify } from 'util';

import { run } from './run';

const defaultMessageKey = 'defaultMessage';
const angularExpressionRegEx = /(\{)\{+([\s\S]*?)(\})\}+/g;

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const makeDir = promisify(fs.mkdir);
const globProm = promisify(glob);

run(async () => {
  for (const inputPath of process.argv.slice(2)) {
    await extractDefaultTranslations(inputPath);
  }
});

async function isPathExists(path) {
  await promisify(fs.access)(path, fs.constants.F_OK);
}

function addMessageToMap(targetMap, key, value) {
  if (targetMap.has(key) && targetMap.get(key) !== value) {
    throw new Error(`Default messages are different for id "${key}"`);
  }
  targetMap.set(key, value);
}

function parseConditionalOperatorAST(subTree) {
  const ids = [];

  if (babelTypes.isStringLiteral(subTree)) {
    ids.push(subTree.value);
  } else if (babelTypes.isConditionalExpression(subTree)) {
    ids.push(...parseConditionalOperatorAST(subTree.consequent));
    ids.push(...parseConditionalOperatorAST(subTree.alternate));
  }

  return ids;
}

function parseConditionalOperatorExpression(expression) {
  let ids = [];

  traverse(parse(expression), {
    enter(path) {
      if (babelTypes.isDirectiveLiteral(path.node)) {
        ids = [path.node.value];
        path.stop();
      } else if (babelTypes.isConditionalExpression(path.node)) {
        ids = parseConditionalOperatorAST(path.node);
        path.stop();
      }
    },
  });

  return ids;
}

function parseFilterObjectExpression(expression) {
  let defaultMessage = '';

  const filterObjectAST = parse(`+${expression}`);
  traverse(filterObjectAST, {
    enter(path) {
      if (babelTypes.isObjectExpression(path.node)) {
        path.node.properties.forEach(property => {
          if (isPropertyWithKey(property, defaultMessageKey) && babelTypes.isStringLiteral(property.value)) {
            defaultMessage = property.value.value;
          }
        });
      }
    }
  });

  return defaultMessage;
}

function getFilterMessages(htmlContent) {
  const expressions = (htmlContent.match(angularExpressionRegEx) || [])
    .filter(expression => expression.indexOf('|') !== -1)
    .filter(expression => expression.indexOf('i18n') !== -1)
    .map(expression => expression.slice(2, -2).trim());

  const defaultMessagesMap = new Map();

  expressions.forEach(expression => {
    const [idsExpression] = expression.match(/[\s\S]+(?=\|[\s]*i18n)/g) || [];
    const [filterObjectExpression] = expression.match(/(?<=\|[\s]*i18n[\s]*:)[\s\S]+/g) || [];

    if (!filterObjectExpression || !idsExpression) {
      throw new Error('Angular.js expression syntax error');
    }

    const messagesIds = parseConditionalOperatorExpression(idsExpression);
    const messageValue = parseFilterObjectExpression(filterObjectExpression);

    messagesIds.forEach(id => {
      addMessageToMap(defaultMessagesMap, id, messageValue);
    });
  });

  return defaultMessagesMap;
}

function getMessagesIdsFromHTMLElement(attributeValue) {
  if (!attributeValue) {
    return [];
  }

  const [expression] = attributeValue.match(angularExpressionRegEx) || [];

  if (expression) {
    return parseConditionalOperatorExpression(expression.slice(2, -2).trim());
  }

  return [attributeValue];
}

function getDirectiveMessages(htmlContent) {
  const defaultMessagesMap = new Map();
  const document = jsdom(htmlContent, {
    features: { ProcessExternalResources: false },
  }).defaultView.document;

  Array.prototype.slice.call(document.getElementsByTagName('*'))
    .filter(element => element.hasAttribute('i18n-id'))
    .forEach(element => {
      const messagesIds = getMessagesIdsFromHTMLElement(element.getAttribute('i18n-id'));
      const messageValue = element.getAttribute('i18n-default-message') || '';

      if (messagesIds.length > 0 && !messageValue) {
        throw new Error(`Default messages are required for ids: ${messagesIds.join(', ')}.`);
      }

      messagesIds.forEach(id => {
        addMessageToMap(defaultMessagesMap, id, messageValue);
      });
    });

  return defaultMessagesMap;
}

function isI18nTranslateFunction(node) {
  return babelTypes.isCallExpression(node) &&
    babelTypes.isMemberExpression(node.callee) &&
    babelTypes.isIdentifier(node.callee.object, { name: 'i18n' }) &&
    babelTypes.isIdentifier(node.callee.property, { name: 'translate' });
}

function isIntlFormatMessageFunction(node) {
  return babelTypes.isCallExpression(node) &&
    babelTypes.isMemberExpression(node.callee) &&
    babelTypes.isIdentifier(node.callee.object, { name: 'intl' }) &&
    babelTypes.isIdentifier(node.callee.property, { name: 'formatMessage' });
}

function isFormattedMessageElement(node) {
  return babelTypes.isJSXOpeningElement(node) &&
    babelTypes.isJSXIdentifier(node.name, { name: 'FormattedMessage' });
}

function isPropertyWithKey(property, identifierName) {
  return babelTypes.isObjectProperty(property) &&
    babelTypes.isIdentifier(property.key, { name: identifierName });
}

function getMessagesFromJSFile(jsFile) {
  const defaultMessagesMap = new Map();

  const content = parse(jsFile, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'typescript',
      'objectRestSpread',
      'classProperties',
      'asyncGenerators',
    ],
  });

  traverse(content, {
    enter(path) {
      let messagesIds = [];
      let messageValue = '';

      if (isI18nTranslateFunction(path.node)) {
        const [idsSubTree, optionsSubTree] = path.node.arguments;
        messagesIds = parseConditionalOperatorAST(idsSubTree);

        if (babelTypes.isObjectExpression(optionsSubTree)) {
          optionsSubTree.properties.forEach(property => {
            if (isPropertyWithKey(property, defaultMessageKey) && babelTypes.isStringLiteral(property.value)) {
              messageValue = property.value.value;
            }
          });
        }
      }

      if (isIntlFormatMessageFunction(path.node)) {
        const options = path.node.arguments[0];

        if (babelTypes.isObjectExpression(options)) {
          options.properties.forEach(property => {
            if (isPropertyWithKey(property, 'id')) {
              messagesIds = parseConditionalOperatorAST(property.value);
            }
            if (isPropertyWithKey(property, defaultMessageKey) && babelTypes.isStringLiteral(property.value)) {
              messageValue = property.value.value;
            }
          });
        }
      }

      if (isFormattedMessageElement(path.node)) {
        path.node.attributes.forEach(attribute => {
          if (babelTypes.isJSXAttribute(attribute) &&
            babelTypes.isJSXIdentifier(attribute.name, { name: 'id' })
          ) {
            messagesIds = parseConditionalOperatorAST(attribute.value);
          }

          if (babelTypes.isJSXAttribute(attribute) &&
            babelTypes.isJSXIdentifier(attribute.name, { name: defaultMessageKey })
          ) {
            if (babelTypes.isJSXExpressionContainer(attribute.value)) {
              messageValue = attribute.value.expression.quasis[0].value.raw;
            } else if (babelTypes.isStringLiteral(attribute.value)) {
              messageValue = attribute.value.value;
            }
          }
        });
      }

      if (messagesIds.length > 0 && !messageValue) {
        throw new Error(`Default messages are required for ids: ${messagesIds.join(', ')}.`);
      }

      messagesIds.forEach(id => {
        addMessageToMap(defaultMessagesMap, id, messageValue);
      });
    }
  });

  return defaultMessagesMap;
}

function throwEntryException(exception, entry) {
  if (exception.message) {
    exception.message = `Error in ${entry}\n${exception.message}`;
    throw exception;
  }
  throw new Error(`Error in ${entry}\n${exception}`);
}

async function extractDefaultTranslations(inputPath) {
  const entries = (await globProm(
    '*.{js,jsx,ts,tsx,html}',
    { cwd: inputPath, matchBase: true },
  )).map(entry => resolvePath(inputPath, entry));

  const [
    htmlEntries,
    jsEntries,
  ] = entries.reduce((acc, entry) => {
    (entry.endsWith('.html') ? acc[0] : acc[1]).push(entry);
    return acc;
  }, [[], []]);

  const defaultMessagesMap = new Map();

  for (const entry of htmlEntries) {
    try {
      const htmlFile = (await readFile(entry)).toString();

      getDirectiveMessages(htmlFile).forEach((value, key) => {
        addMessageToMap(defaultMessagesMap, key, value);
      });

      getFilterMessages(htmlFile).forEach((value, key) => {
        addMessageToMap(defaultMessagesMap, key, value);
      });
    } catch (error) {
      throwEntryException(error, entry);
    }
  }

  for (const entry of jsEntries) {
    try {
      const jsFile = (await readFile(entry)).toString();

      getMessagesFromJSFile(jsFile).forEach((value, key) => {
        addMessageToMap(defaultMessagesMap, key, value);
      });
    } catch (error) {
      throwEntryException(error, entry);
    }
  }

  const defaultMessages = {};

  defaultMessagesMap.forEach((value, key) => {
    defaultMessages[key] = value;
  });

  try {
    await isPathExists(resolvePath(inputPath, 'translations'));
  } catch (_) {
    await makeDir(resolvePath(inputPath, 'translations'));
  }

  await writeFile(
    resolvePath(inputPath, 'translations/defaultMessages.json'),
    JSON.stringify(defaultMessages, null, 2),
  );
}
