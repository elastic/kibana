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

import * as ts from 'typescript';
import * as path from 'path';
import { getDescriptor } from './serializer';
import { traverseNodes } from './ts_parser';

export function loadFixtureProgram(fixtureName: string) {
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

describe('getDescriptor', () => {
  const usageInterfaces = new Map<string, ts.InterfaceDeclaration>();
  let tsProgram;
  beforeAll(() => {
    const { program, sourceFile } = loadFixtureProgram('constants');
    tsProgram = program;
    for (const node of traverseNodes(sourceFile)) {
      if (ts.isInterfaceDeclaration(node)) {
        const interfaceName = node.name.getText();
        usageInterfaces.set(interfaceName, node);
      }
    }
  });

  it('serializes flat types', () => {
    const usageInterface = usageInterfaces.get('Usage');
    const descriptor = getDescriptor(usageInterface, tsProgram);
    expect(descriptor).toEqual({
      locale: { kind: 142 },
    });
  });

  it('serializes union types', () => {
    const usageInterface = usageInterfaces.get('WithUnion');
    const descriptor = getDescriptor(usageInterface, tsProgram);

    expect(descriptor).toEqual({
      prop1: { kind: 142 },
      prop2: { kind: 142 },
      prop3: { kind: 142 },
      prop4: { kind: 10 },
      prop5: { kind: 8 },
    });
  });

  it('serializes Moment Dates', () => {
    const usageInterface = usageInterfaces.get('WithMoment');
    const descriptor = getDescriptor(usageInterface, tsProgram);

    expect(descriptor).toEqual({
      prop1: { kind: 1000 },
      prop2: { kind: 1000 },
    });
  });

  it.todo('throws error on conflicting union types');
  it.todo('throws error on unsupported union types');
});
