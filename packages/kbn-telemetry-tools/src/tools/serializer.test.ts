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
import { getDescriptor, TelemetryKinds } from './serializer';
import { traverseNodes } from './ts_parser';

export function loadFixtureProgram(fixtureName: string) {
  const fixturePath = path.resolve(
    process.cwd(),
    'src',
    'fixtures',
    'telemetry_collectors',
    `${fixtureName}.ts`
  );
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
  let tsProgram: ts.Program;
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
    const descriptor = getDescriptor(usageInterface!, tsProgram);
    expect(descriptor).toEqual({
      locale: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
    });
  });

  it('serializes union types', () => {
    const usageInterface = usageInterfaces.get('WithUnion');
    const descriptor = getDescriptor(usageInterface!, tsProgram);

    expect(descriptor).toEqual({
      prop1: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
      prop2: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
      prop3: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
      prop4: { kind: ts.SyntaxKind.StringLiteral, type: 'StringLiteral' },
      prop5: { kind: ts.SyntaxKind.FirstLiteralToken, type: 'FirstLiteralToken' },
    });
  });

  it('serializes Moment Dates', () => {
    const usageInterface = usageInterfaces.get('WithMoment');
    const descriptor = getDescriptor(usageInterface!, tsProgram);
    expect(descriptor).toEqual({
      prop1: { kind: TelemetryKinds.MomentDate, type: 'MomentDate' },
      prop2: { kind: TelemetryKinds.MomentDate, type: 'MomentDate' },
      prop3: { kind: TelemetryKinds.MomentDate, type: 'MomentDate' },
      prop4: { kind: TelemetryKinds.Date, type: 'Date' },
    });
  });

  it('throws error on conflicting union types', () => {
    const usageInterface = usageInterfaces.get('WithConflictingUnion');
    expect(() => getDescriptor(usageInterface!, tsProgram)).toThrowError(
      'Mapping does not support conflicting union types.'
    );
  });

  it('throws error on unsupported union types', () => {
    const usageInterface = usageInterfaces.get('WithUnsupportedUnion');
    expect(() => getDescriptor(usageInterface!, tsProgram)).toThrowError(
      'Mapping does not support conflicting union types.'
    );
  });
});
