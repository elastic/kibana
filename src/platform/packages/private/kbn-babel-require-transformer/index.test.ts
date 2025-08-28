/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformSync } from '@babel/core';
import plugin from '.';

function transform(code, filename = '/tmp/project/src/file.js') {
  return transformSync(code, {
    ast: true,
    code: false,
    filename,
    plugins: [[plugin]],
  });
}

function isRequireCall(node, value) {
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
    );
    expect(helper).toBeTruthy();

    const decl = body.find((n) => n.type === 'VariableDeclaration');
    expect(decl).toBeTruthy();

    const init = decl.declarations[0].init;
    expect(init.type).toBe('CallExpression');
    expect(init.callee.type).toBe('Identifier');
    expect(init.callee.name).toBe('deferRequire');
    expect(init.arguments[0].type).toBe('StringLiteral');
    expect(init.arguments[0].value).toBe('./x');
  });

  it('rewrites member access on tracked identifiers to use .value', () => {
    const code = `const x = require('./x'); x.b();`;

    const {
      ast: {
        program: { body },
      },
    } = transform(code);

    // Find the call expression statement
    const exprStmt = body.find((n) => n.type === 'ExpressionStatement');
    expect(exprStmt).toBeTruthy();

    const call = exprStmt.expression;
    expect(call.type).toBe('CallExpression');

    const member = call.callee; // x.value.b
    expect(member.type).toBe('MemberExpression');

    const obj = member.object; // x.value
    expect(obj.type).toBe('MemberExpression');
    expect(obj.object.type).toBe('Identifier');
    expect(obj.object.name).toBe('x');
    expect(obj.property.type).toBe('Identifier');
    expect(obj.property.name).toBe('value');
    expect(member.property.type).toBe('Identifier');
    expect(member.property.name).toBe('b');
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
    );
    expect(helper).toBeFalsy();

    expect(body.length).toBe(1);

    const decl = body[0].declarations[0];
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

    const helper = body.find((n) => n.type === 'FunctionDeclaration');
    expect(helper && helper.id && helper.id.name).toBe('deferRequire');

    const xDecl = body.find(
      (n) =>
        n.type === 'VariableDeclaration' &&
        n.declarations[0] &&
        n.declarations[0].id &&
        n.declarations[0].id.type === 'Identifier' &&
        n.declarations[0].id.name === 'x'
    );
    expect(xDecl).toBeTruthy();

    const init = xDecl.declarations[0].init;
    expect(init.type).toBe('CallExpression');
    expect(init.callee.type).toBe('Identifier');
    expect(init.callee.name).toBe('deferRequire');
    expect(init.arguments[0].value).toBe('./x');

    const yDeclStmt = body.find(
      (n) =>
        n.type === 'VariableDeclaration' &&
        n.declarations[0] &&
        n.declarations[0].id &&
        n.declarations[0].id.type === 'Identifier' &&
        n.declarations[0].id.name === 'y'
    );
    expect(yDeclStmt).toBeTruthy();
    expect(yDeclStmt.declarations[0].init.type).toBe('NumericLiteral');
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

    const decl = body[0].declarations[0];
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

    const inner = body[0].body.body[0];
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

    const decl = body[0].declarations[0];
    expect(decl.id.type).toBe('Identifier');
    expect(isRequireCall(decl.init, './x')).toBe(true);
  });
});
