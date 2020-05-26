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

import { parseUsageCollection } from './ts_parser';
import * as ts from 'typescript';
import * as path from 'path';
import { parsedWorkingCollector } from './__fixture__/parsed_working_collector';
import { parsedNestedCollector } from './__fixture__/parsed_nested_collector';
import { parsedExternallyDefinedCollector } from './__fixture__/parsed_externally_defined_collector';

function loadFixtureProgram(fixtureName: string) {
  const fixturePath = path.resolve(__dirname, '__fixture__', `${fixtureName}.ts`);
  const tsConfig = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
  if (!tsConfig) {
    throw new Error('Could not find a valid tsconfig.json.');
  }
  const program = ts.createProgram([fixturePath], tsConfig as any);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(fixturePath);
  if (!sourceFile) {
    throw Error('sourceFile is undefined!');
  }
  return { program, checker, sourceFile };
}

describe('ts-test', () => {
  it.todo('throws when a function is returned from fetch');
  it.todo('throws when an object is not returned from fetch');

  it('throws when mapping fields is not defined', () => {
    const { checker, sourceFile } = loadFixtureProgram('unmapped_collector');
    expect(() => [...parseUsageCollection(sourceFile, checker)]).toThrowErrorMatchingSnapshot();
  });

  it('parses root level defined collector', () => {
    const { checker, sourceFile } = loadFixtureProgram('working_collector');
    const result = [...parseUsageCollection(sourceFile, checker)];
    expect(result).toEqual([parsedWorkingCollector]);
  });

  it('parses nested collectors', () => {
    const { checker, sourceFile } = loadFixtureProgram('nested_collector');
    const result = [...parseUsageCollection(sourceFile, checker)];
    expect(result).toEqual([parsedNestedCollector]);
  });

  it('parses externally defined collectors', () => {
    const { checker, sourceFile } = loadFixtureProgram('externally_defined_collector');
    const result = [...parseUsageCollection(sourceFile, checker)];
    expect(result).toEqual(parsedExternallyDefinedCollector);
  });

  it('skips files that do not define a collector', () => {
    const { checker, sourceFile } = loadFixtureProgram('file_with_no_collector');
    const result = [...parseUsageCollection(sourceFile, checker)];
    expect(result).toEqual([]);
  });
});
