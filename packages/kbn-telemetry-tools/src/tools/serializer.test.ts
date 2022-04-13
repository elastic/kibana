/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  const usageInterfaces = new Map<string, ts.InterfaceDeclaration | ts.TypeAliasDeclaration>();
  let tsProgram: ts.Program;
  beforeAll(() => {
    const { program, sourceFile } = loadFixtureProgram('constants');
    tsProgram = program;
    for (const node of traverseNodes(sourceFile)) {
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
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
      prop3: { items: { kind: TelemetryKinds.MomentDate, type: 'MomentDate' } },
      prop4: { items: { kind: TelemetryKinds.Date, type: 'Date' } },
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

  it('serializes TypeAliasDeclaration', () => {
    const usageInterface = usageInterfaces.get('TypeAliasWithUnion')!;
    const descriptor = getDescriptor(usageInterface, tsProgram);
    expect(descriptor).toEqual({
      locale: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
      prop1: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
      prop2: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
      prop3: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
      prop4: { kind: ts.SyntaxKind.StringLiteral, type: 'StringLiteral' },
      prop5: { kind: ts.SyntaxKind.FirstLiteralToken, type: 'FirstLiteralToken' },
    });
  });

  it('serializes Record entries', () => {
    const usageInterface = usageInterfaces.get('TypeAliasWithRecord')!;
    const descriptor = getDescriptor(usageInterface, tsProgram);
    expect(descriptor).toEqual({
      locale: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
      '@@INDEX@@': { kind: ts.SyntaxKind.NumberKeyword, type: 'NumberKeyword' },
    });
  });

  it('serializes MappedTypes', () => {
    const usageInterface = usageInterfaces.get('MappedTypes')!;
    const descriptor = getDescriptor(usageInterface, tsProgram);
    expect(descriptor).toEqual({
      mappedTypeWithExternallyDefinedProps: {
        prop1: { kind: ts.SyntaxKind.NumberKeyword, type: 'NumberKeyword' },
        prop2: { kind: ts.SyntaxKind.NumberKeyword, type: 'NumberKeyword' },
      },
      mappedTypeWithOneInlineProp: {
        prop3: { kind: ts.SyntaxKind.NumberKeyword, type: 'NumberKeyword' },
      },
    });
  });

  it('serializes RecordWithKnownProps', () => {
    const usageInterface = usageInterfaces.get('RecordWithKnownProps')!;
    const descriptor = getDescriptor(usageInterface, tsProgram);
    expect(descriptor).toEqual({
      prop1: { kind: ts.SyntaxKind.NumberKeyword, type: 'NumberKeyword' },
      prop2: { kind: ts.SyntaxKind.NumberKeyword, type: 'NumberKeyword' },
    });
  });

  it('serializes RecordWithKnownAllProps', () => {
    const usageInterface = usageInterfaces.get('RecordWithKnownAllProps')!;
    const descriptor = getDescriptor(usageInterface, tsProgram);
    expect(descriptor).toEqual({
      prop1: { kind: ts.SyntaxKind.NumberKeyword, type: 'NumberKeyword' },
      prop2: { kind: ts.SyntaxKind.NumberKeyword, type: 'NumberKeyword' },
      prop3: { kind: ts.SyntaxKind.NumberKeyword, type: 'NumberKeyword' },
      prop4: { kind: ts.SyntaxKind.NumberKeyword, type: 'NumberKeyword' },
    });
  });

  it('serializes IndexedAccessType', () => {
    const usageInterface = usageInterfaces.get('IndexedAccessType')!;
    const descriptor = getDescriptor(usageInterface, tsProgram);
    expect(descriptor).toEqual({
      prop1: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
      prop2: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
    });
  });

  it('serializes OmitIndexedAccessType', () => {
    const usageInterface = usageInterfaces.get('OmitIndexedAccessType')!;
    const descriptor = getDescriptor(usageInterface, tsProgram);
    expect(descriptor).toEqual({
      prop3: { kind: ts.SyntaxKind.StringKeyword, type: 'StringKeyword' },
      prop4: { kind: ts.SyntaxKind.StringLiteral, type: 'StringLiteral' },
      prop5: { kind: ts.SyntaxKind.FirstLiteralToken, type: 'FirstLiteralToken' },
    });
  });
});
