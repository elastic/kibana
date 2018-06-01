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

import path from 'path';
import JSON5 from 'json5';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import {
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
} from '@babel/types';

import { globAsync, readFileAsync } from './utils';

function plainify(object) {
  const result = {};

  for (const [key, value] of Object.entries(object)) {
    if (typeof value === 'object' && value !== null) {
      for (const [nestedKey, nestedValue] of Object.entries(plainify(value))) {
        result[`${key}.${nestedKey}`] = nestedValue;
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

function arraysDiff(left = [], right = []) {
  const leftDiff = left.filter(value => right.includes(value));
  const rightDiff = right.filter(value => left.includes(value));
  return [leftDiff, rightDiff];
}

function readKeySubTree(node) {
  if (isStringLiteral(node)) {
    return node.value;
  }
  if (isIdentifier(node)) {
    return node.name;
  }
}

function getDuplicates(node, parentPath) {
  const keys = [];
  const duplicates = [];

  for (const property of node.properties) {
    const key = readKeySubTree(property.key);
    const nodePath = `${parentPath}.${key}`;

    if (!duplicates.includes(nodePath)) {
      if (!keys.includes(nodePath)) {
        keys.push(nodePath);
      } else {
        duplicates.push(nodePath);
      }
    }

    if (isObjectExpression(property.value)) {
      duplicates.push(...getDuplicates(property.value, `${parentPath}.${key}`));
    }
  }

  return duplicates;
}

function verifyJSON(json, fileName) {
  const jsonAST = parse(`+${json}`);
  let namespace = '';

  traverse(jsonAST, {
    enter(path) {
      if (isObjectExpression(path.node)) {
        if (path.node.properties.length !== 1) {
          throw new Error(
            `Locale file ${fileName} should be a JSON with a single-key object`
          );
        }
        if (!isObjectExpression(path.node.properties[0].value)) {
          throw new Error(`Invalid locale file: ${fileName}`);
        }

        namespace = readKeySubTree(path.node.properties[0].key);
        const duplicates = getDuplicates(
          path.node.properties[0].value,
          namespace
        );

        if (duplicates.length !== 0) {
          throw new Error(
            `There are translation id duplicates in locale file ${fileName}:
${duplicates.join(', ')}`
          );
        }

        path.stop();
      }
    },
  });

  return namespace;
}

async function checkFile(localePath) {
  let errorMessage = '';

  const defaultMessagesBuffer = await readFileAsync(
    path.resolve(path.dirname(localePath), 'defaultMessages.json')
  );
  const defaultMessagesIds = Object.keys(
    JSON.parse(defaultMessagesBuffer.toString())
  );

  const localeBuffer = await readFileAsync(localePath);

  const namespace = verifyJSON(localeBuffer.toString(), localePath);

  const translations = JSON5.parse(localeBuffer.toString());
  const translationsIds = Object.keys(plainify(translations));

  const [unusedTranslations, missingTranslations] = arraysDiff(
    translationsIds,
    defaultMessagesIds
  );

  if (unusedTranslations.length > 0) {
    errorMessage += `\nThere are unused translations in locale file ${localePath}:
${unusedTranslations.join(', ')}`;
  }

  if (missingTranslations.length > 0) {
    errorMessage += `\nThere are missing translations in locale file ${localePath}:
${missingTranslations.join(', ')}`;
  }

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return namespace;
}

export async function checkLocaleFiles(pluginsPaths) {
  const pluginsMapByLocale = new Map();

  for (const pluginPath of pluginsPaths) {
    const globOptions = {
      ignore: [
        './translations/defaultMessages.json',
        './translations/messagesCache.json',
      ],
      cwd: path.resolve(pluginPath),
    };

    const localeEntries = await globAsync('./translations/*.json', globOptions);

    for (const entry of localeEntries) {
      const locale = path.basename(entry);

      if (pluginsMapByLocale.has(locale)) {
        pluginsMapByLocale.get(locale).push(pluginPath);
      } else {
        pluginsMapByLocale.set(locale, [pluginPath]);
      }
    }
  }

  for (const locale of pluginsMapByLocale.keys()) {
    const namespaces = [];
    for (const pluginPath of pluginsMapByLocale.get(locale)) {
      const namespace = await checkFile(
        path.resolve(pluginPath, 'translations', locale)
      );
      if (namespaces.includes(namespace)) {
        throw new Error(
          `Error in ${pluginPath} plugin ${locale} locale file\nLocale file namespace should be unique for each plugin`
        );
      }
      namespaces.push(namespace);
    }
  }
}
