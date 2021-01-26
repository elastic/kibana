/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as ts from 'typescript';
import * as path from 'path';
import { loadProgram } from './utils';
import { getInterfacesDescriptors } from './interface_to_object';

describe('getInterfacesDescriptors', () => {
  it('creates object descriptors from interfaces', async () => {
    const fixturePath = path.resolve(__dirname, '__fixture__', 'usage_stats_type.ts');
    const { program } = loadProgram('./', [fixturePath]);
    const sourceFile = program.getSourceFile(fixturePath);
    if (!sourceFile) {
      throw Error('sourceFile is undefined!');
    }

    const results = getInterfacesDescriptors(sourceFile, program, 'UsageStats');
    expect(results).toEqual([
      {
        withBooleanValue: {
          kind: ts.SyntaxKind.BooleanKeyword,
          type: 'BooleanKeyword',
        },
        withStringValue: {
          kind: ts.SyntaxKind.StringKeyword,
          type: 'StringKeyword',
        },
        withNumberValue: {
          kind: ts.SyntaxKind.NumberKeyword,
          type: 'NumberKeyword',
        },
        withStringArrayValue: {
          items: {
            kind: ts.SyntaxKind.StringKeyword,
            type: 'StringKeyword',
          },
        },
        withObjectValue: {
          withBooleanValue: {
            kind: ts.SyntaxKind.BooleanKeyword,
            type: 'BooleanKeyword',
          },
        },
        withObjectArrayValue: {
          items: {
            withNumberValue: {
              kind: ts.SyntaxKind.NumberKeyword,
              type: 'NumberKeyword',
            },
          },
        },
      },
    ]);
  });
});
