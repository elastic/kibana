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

import { resolve } from 'path';
import traverse from '@babel/traverse';
import { parse } from '@babel/parser';
import {
  isIdentifier,
  isObjectExpression,
  isStringLiteral,
} from '@babel/types';

import { writeFileAsync } from './utils';

function* buildMessagesMap(root, idPath) {
  let propertyKeyString = '';
  let fullIdString = '';

  for (const property of root.properties) {
    if (isStringLiteral(property.key)) {
      propertyKeyString = property.key.value;
    } else if (isIdentifier(property.key)) {
      propertyKeyString = property.key.name;
    }

    if (idPath) {
      fullIdString = `${idPath}.${propertyKeyString}`;
    } else {
      fullIdString = `${propertyKeyString}`;
    }

    if (isStringLiteral(property.value)) {
      yield [fullIdString, property.value.end];
    } else if (isObjectExpression(property.value)) {
      yield* buildMessagesMap(property.value, fullIdString);
    }
  }
}

export async function writeContextToJSON(inputPath, json, defaultMessagesMap) {
  const jsonBuffer = Buffer.from(json);
  const jsonAST = parse(`+${json}`);
  const messagesPositionsMapById = new Map();

  traverse(jsonAST, {
    enter(path) {
      if (isObjectExpression(path.node)) {
        for (const [id, position] of buildMessagesMap(path.node)) {
          messagesPositionsMapById.set(id, position);
        }
        path.stop();
      }
    },
  });

  let resultBuffer = Buffer.from('');
  let bufferIndex = 0;

  for (const [id, position] of messagesPositionsMapById) {
    const context = defaultMessagesMap.get(id).context;

    resultBuffer = Buffer.concat([
      resultBuffer,
      jsonBuffer.slice(bufferIndex, position),
      Buffer.from(context ? ` // ${context}` : ''),
    ]);

    bufferIndex = position;
  }

  resultBuffer = Buffer.concat([resultBuffer, jsonBuffer.slice(bufferIndex)]);

  await writeFileAsync(
    resolve(inputPath, 'translations', 'defaultMessages.json'),
    resultBuffer
  );
}
