/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformSync, type BabelFileResult } from '@babel/core';
import * as t from '@babel/types';
import plugin from '.';

function transform(code: string, filename = '/tmp/project/src/file.js'): { ast: t.File } {
  const res = transformSync(code, {
    ast: true,
    code: false,
    filename,
    plugins: [[plugin as any]],
  }) as BabelFileResult | null;

  if (!res || !res.ast) {
    throw new Error('transform produced no AST');
  }

  return { ast: res.ast as t.File };
}

function isRequireCall(node: any, value: string): boolean {
  return (
    node &&
    node.type === 'CallExpression' &&
    node.callee &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments &&
    node.arguments.length === 1 &&
    node.arguments[0].type === 'StringLiteral' &&
    node.arguments[0].value === value
  );
}

describe('kbn-babel-require-transformer (deferRequire)', () => {
  it('transforms identifier-bound relative require and injects helper', () => {
    const code = `const x = require('./x');`;

    const {
      ast: {
        program: { body },
      },
    } = transform(code);

    const helper = body.find(
      (n) => n.type === 'FunctionDeclaration' && n.id && n.id.name === 'deferRequire'
    ) as t.FunctionDeclaration | undefined;
    expect(helper).toBeTruthy();

    const decl = body.find((n) => n.type === 'VariableDeclaration') as
      | t.VariableDeclaration
      | undefined;
    expect(decl).toBeTruthy();
    const init = (decl as t.VariableDeclaration).declarations[0].init as t.CallExpression;
    expect(init.type).toBe('CallExpression');
    expect(t.isIdentifier(init.callee)).toBe(true);
    if (t.isIdentifier(init.callee)) {
      expect(init.callee.name).toBe('deferRequire');
    }
    const firstArg = init.arguments[0];
    expect(t.isStringLiteral(firstArg)).toBe(true);
    if (t.isStringLiteral(firstArg)) {
      expect(firstArg.value).toBe('./x');
    }
  });

  it('rewrites member access on tracked identifiers to use .value', () => {
    const code = `const x = require('./x'); x.b();`;

    const {
      ast: {
        program: { body },
      },
    } = transform(code);

    // Find the call expression statement
    const exprStmt = body.find((n) => n.type === 'ExpressionStatement') as
      | t.ExpressionStatement
      | undefined;
    expect(exprStmt).toBeTruthy();
    const call = (exprStmt as t.ExpressionStatement).expression as t.CallExpression;
    expect(call.type).toBe('CallExpression');

    const member = call.callee as t.MemberExpression; // x.value.b
    expect(member.type).toBe('MemberExpression');

    const obj = member.object as t.MemberExpression; // x.value
    expect(obj.type).toBe('MemberExpression');
    expect((obj.object as t.Identifier).type).toBe('Identifier');
    expect((obj.object as t.Identifier).name).toBe('x');
    expect((obj.property as t.Identifier).type).toBe('Identifier');
    expect((obj.property as t.Identifier).name).toBe('value');
    expect((member.property as t.Identifier).type).toBe('Identifier');
    expect((member.property as t.Identifier).name).toBe('b');
  });

  it('leaves bare specifier requires unchanged (no helper)', () => {
    const code = `const x = require('pkg');`;

    const {
      ast: {
        program: { body },
      },
    } = transform(code);

    // No helper should be injected because this require does not qualify
    const helper = body.find(
      (n) => n.type === 'FunctionDeclaration' && n.id && n.id.name === 'deferRequire'
    ) as t.FunctionDeclaration | undefined;
    expect(helper).toBeFalsy();

    expect(body.length).toBe(1);

    const first = body[0] as t.VariableDeclaration;
    const decl = first.declarations[0];
    expect(decl.id.type).toBe('Identifier');
    expect(isRequireCall(decl.init, 'pkg')).toBe(true);
  });

  it('splits multi-declarators and transforms only qualifying ones', () => {
    const code = `const x = require('./x'), y = 1;`;

    const {
      ast: {
        program: { body },
      },
    } = transform(code);

    // Expect exactly 3 statements: helper + each declarator split
    expect(body.length).toBe(3);

    const helper = body.find((n) => n.type === 'FunctionDeclaration') as
      | t.FunctionDeclaration
      | undefined;
    expect(helper && helper.id && helper.id.name).toBe('deferRequire');

    const xDecl = body.find(
      (n) =>
        n.type === 'VariableDeclaration' &&
        n.declarations[0] &&
        n.declarations[0].id &&
        n.declarations[0].id.type === 'Identifier' &&
        n.declarations[0].id.name === 'x'
    ) as t.VariableDeclaration | undefined;
    expect(xDecl).toBeTruthy();
    const init = (xDecl as t.VariableDeclaration).declarations[0].init as t.CallExpression;
    expect(init.type).toBe('CallExpression');
    expect(t.isIdentifier(init.callee)).toBe(true);
    if (t.isIdentifier(init.callee)) {
      expect(init.callee.name).toBe('deferRequire');
    }
    const firstArg2 = init.arguments[0];
    expect(t.isStringLiteral(firstArg2)).toBe(true);
    if (t.isStringLiteral(firstArg2)) {
      expect(firstArg2.value).toBe('./x');
    }

    const yDeclStmt = body.find(
      (n) =>
        n.type === 'VariableDeclaration' &&
        n.declarations[0] &&
        n.declarations[0].id &&
        n.declarations[0].id.type === 'Identifier' &&
        n.declarations[0].id.name === 'y'
    ) as t.VariableDeclaration | undefined;
    expect(yDeclStmt).toBeTruthy();
    expect((yDeclStmt as t.VariableDeclaration).declarations[0].init!.type).toBe('NumericLiteral');
  });

  it('does not transform destructuring require (keeps semantics)', () => {
    const code = `const { a } = require('./x');`;
    const {
      ast: {
        program: { body },
      },
    } = transform(code);

    // No helper injected in this case (no tracked identifiers)
    const helper = body.find(
      (n) => n.type === 'FunctionDeclaration' && n.id && n.id.name === 'deferRequire'
    );
    expect(helper).toBeFalsy();

    const first = body[0] as t.VariableDeclaration;
    const decl = first.declarations[0];
    expect(decl.id.type).toBe('ObjectPattern');
    expect(isRequireCall(decl.init, './x')).toBe(true);
  });

  it('does not transform nested (non top-level) requires', () => {
    const code = `function f(){ const x = require('./x'); }`;

    const {
      ast: {
        program: { body },
      },
    } = transform(code);

    expect(body[0].type).toBe('FunctionDeclaration');
    const fn = body[0] as t.FunctionDeclaration;
    const inner = fn.body.body[0] as t.VariableDeclaration;
    expect(inner.type).toBe('VariableDeclaration');

    const innerDecl = inner.declarations[0];
    expect(innerDecl.id.type).toBe('Identifier');
    expect(isRequireCall(innerDecl.init, './x')).toBe(true);
  });

  it('skips transforming files under public/ (filename gating)', () => {
    const code = `const x = require('./x');`;

    const {
      ast: {
        program: { body },
      },
    } = transform(code, '/tmp/project/src/public/file.js');
    expect(body.length).toBe(1);

    const first = body[0] as t.VariableDeclaration;
    const decl = first.declarations[0];
    expect(decl.id.type).toBe('Identifier');
    expect(isRequireCall(decl.init, './x')).toBe(true);
  });
});
