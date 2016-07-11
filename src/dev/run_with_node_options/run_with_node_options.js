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

import execa from 'execa';
import { existsSync, readFile } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { REPO_ROOT } from '../constants';

const readFileAsync = promisify(readFile);

function removeComments(nodeOptionsFileStr) {
  const commentsRegex = /(^#.*$)/gim;
  let match = commentsRegex.exec(nodeOptionsFileStr);
  let newString = nodeOptionsFileStr;
  while (match != null) {
    newString = newString.replace(match[1], '');
    match = commentsRegex.exec(nodeOptionsFileStr);
  }

  return newString;
}

function removeEmptyLines(nodeOptionsFileStr) {
  const emptyLinesRegex = /(^\n)/gim;
  return nodeOptionsFileStr.replace(emptyLinesRegex, '');
}

function getNodeOptionsStr(nodeOptionsFileStr) {
  const fileParseRegex = /^((.+?)[=](.*))$/gim;
  let matches = '';
  let match;
  while ((match = fileParseRegex.exec(nodeOptionsFileStr)) !== null) {
    matches += `${match[1].trim()}${matches ? ' ' : ''}`;
  }
  return matches;
}

async function getNodeOptionsFromFile(filePath) {
  if (!filePath || !existsSync(filePath)) {
    return {};
  }

  const nodeOptionsFileStr = (await readFileAsync(filePath)).toString();
  const sanitizedNodeOptionsFileStr = removeEmptyLines(removeComments(nodeOptionsFileStr));
  const nodeOptionsStr = getNodeOptionsStr(sanitizedNodeOptionsFileStr);

  if (!nodeOptionsStr && !process.env.NODE_OPTIONS) {
    return {};
  }

  const sanitizedNodeOptionsStr = nodeOptionsStr ? `${nodeOptionsStr} ` : '';

  return {
    NODE_OPTIONS: `${sanitizedNodeOptionsStr}${process.env.NODE_OPTIONS || ''}`,
  };
}

async function runWithNodeOptions({ command }) {
  if (!command) {
    return;
  }

  const nodeOptionsFromFile = await getNodeOptionsFromFile(
    join(REPO_ROOT, 'config', 'node.dev.options')
  );

  const childEnv = Object.assign(process.env, nodeOptionsFromFile);

  await execa.command(command, {
    shell: true,
    stdio: 'inherit',
    env: childEnv,
  });
}

export { runWithNodeOptions };
