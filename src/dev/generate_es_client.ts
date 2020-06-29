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

import { resolve, join } from 'path';
import fs from 'fs';

const REPO_ROOT = resolve(__dirname, '../../');
const GENERATION_START_SYMBOL = '/* GENERATED */';
const GENERATION_END_SYMBOL = '/* /GENERATED */';

const sourceFile = join(REPO_ROOT, 'node_modules', '@elastic', 'elasticsearch', 'index.d.ts');
const apiFile = join(
  REPO_ROOT,
  'src',
  'core',
  'server',
  'elasticsearch',
  'client',
  'client_facade.ts'
);
const implemFile = join(
  REPO_ROOT,
  'src',
  'core',
  'server',
  'elasticsearch',
  'client',
  'client_wrapper.ts'
);

const generate = () => {
  const clientAPI = readClientAPI();
  const { api, impl } = processClientAPI(clientAPI);

  writeFacadeAPI(api);
  writeWrapperDefinition(impl);

  // apply es-lint to the generated file
  // as indentation may not be correct, and some of our lint rules are not respected by the es lib.
  process.argv.push('--fix');
  process.argv.push(apiFile);
  process.argv.push(implemFile);
  require('./run_eslint');
};

const apiLineRegexp = /^([a-zA-Z_]*)[<]/;
const callbackApiRegexp = /TransportRequestCallback/;

const blockStartRegexp = /^([a-zA-Z_]*)[:][ ][{]$/;
const blockEndRegexp = /^[}]$/;

const processClientAPI = (rawContent: string) => {
  const apiLines: string[] = [];
  const implementationLines: string[] = [];

  let currentBlock: string | null = null;
  let inDeletedBlock = false;

  rawContent
    .split('\n')
    .map((line) => line.trim())
    .forEach((line) => {
      const blockStartMatch = blockStartRegexp.exec(line);

      // start of a block of API, I.E : `asyncSearch: {`
      if (blockStartMatch) {
        currentBlock = blockStartMatch[1];
        if (currentBlock.includes('_')) {
          inDeletedBlock = true;
        } else {
          // add `[blockName]: {` to both API and implementation
          apiLines.push(line);
          implementationLines.push(line);
        }
      } else if (blockEndRegexp.test(line)) {
        if (!inDeletedBlock) {
          apiLines.push('}');
          implementationLines.push('},');
        }
        currentBlock = null;
        inDeletedBlock = false;
      } else {
        const isApiLineMatch = apiLineRegexp.exec(line);
        const isCallbackApi = callbackApiRegexp.test(line);
        if (isApiLineMatch && !isCallbackApi && !inDeletedBlock) {
          const apiName = isApiLineMatch[1];
          if (!apiName.includes('_')) {
            apiLines.push(line);
            implementationLines.push(
              `${apiName}: (params, options) => client${
                currentBlock ? '.' + currentBlock : ''
              }.${apiName}(params, addHeaders(options)),`
            );
          }
        }
      }
    });

  return { api: apiLines.join('\n'), impl: implementationLines.join('\n') };
};

const readClientAPI = (): string => {
  const sourceFileContent = fs.readFileSync(sourceFile).toString('utf-8');
  return sourceFileContent.substring(
    sourceFileContent.indexOf(GENERATION_START_SYMBOL) + GENERATION_START_SYMBOL.length,
    sourceFileContent.indexOf(GENERATION_END_SYMBOL)
  );
};

const writeFacadeAPI = (apiDefinition: string) => {
  injectGeneratedContent(apiFile, apiDefinition);
};

const writeWrapperDefinition = (implemDefinition: string) => {
  injectGeneratedContent(implemFile, implemDefinition);
};

const injectGeneratedContent = (filepath: string, injectedContent: string) => {
  const fileContent = fs.readFileSync(filepath, 'utf-8').toString();

  const newFileContent =
    fileContent.slice(
      0,
      fileContent.indexOf(GENERATION_START_SYMBOL) + GENERATION_START_SYMBOL.length
    ) +
    `\n` +
    injectedContent +
    `\n` +
    fileContent.slice(fileContent.indexOf(GENERATION_END_SYMBOL));

  fs.writeFileSync(filepath, newFileContent);
};

generate();
