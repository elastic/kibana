/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Ast from './ast_types';

const isCall = (s: Ast.Stmt): s is Ast.ExprStmt<Ast.CallExpr> =>
  Ast.isExprStmt(s) && Ast.isCallExpr(s.X);

const isCallOf = (s: Ast.Stmt, n: string): s is Ast.ExprStmt<Ast.CallExpr> =>
  isCall(s) && Ast.isIdent(s.X.Fn) && s.X.Fn.Name === n;

const isAssignment =
  (varName: string) =>
  (s: Ast.Stmt): s is Ast.AssignStmt<Ast.Ident> =>
    Ast.isAssignStmt(s) && Ast.isIdent(s.LHS) && s.LHS.Name === varName;

const isKwArg = (e: Ast.Expr): e is Ast.BinaryExpr<Ast.Ident> =>
  Ast.isBinaryExpr(e) && Ast.isIdent(e.X) && e.Op === Ast.Token.EQ;

const getKwArg = (e: Ast.CallExpr, name: string) =>
  e.Args.filter(isKwArg).find((a) => a.X.Name === name);

const nameIs = (call: Ast.ExprStmt<Ast.CallExpr>, name: string) => {
  const nameArg = getKwArg(call.X, 'name');
  return nameArg && Ast.isLiteral(nameArg.Y) && nameArg.Y.Value === name;
};

const getValue = (file: Ast.File, name: string) => {
  const stmt = file.Stmts.find(isAssignment(name));
  if (!stmt) {
    throw new Error(`unable to find value of variable [${name}] in [${file.Path}]`);
  }

  return stmt.RHS;
};

const resolveIdent = (file: Ast.File, expr: Ast.Expr) => {
  let value = expr;
  while (Ast.isIdent(value)) {
    value = getValue(file, value.Name);
  }
  return value;
};

const getListExprs = (file: Ast.File, expr: Ast.Expr): Ast.Expr[] => {
  const resolved = resolveIdent(file, expr);

  if (Ast.isListExpr(resolved)) {
    return [...resolved.List];
  }

  if (Ast.isBinaryExpr(resolved)) {
    return [...getListExprs(file, resolved.X), ...getListExprs(file, resolved.Y)];
  }

  throw new Error('unable to determine list expressions');
};

export function getRefdPkgs(file: Ast.File) {
  for (const s of file.Stmts) {
    if ((isCallOf(s, 'alias') || isCallOf(s, 'filegroup')) && nameIs(s, 'build_types')) {
      return [];
    }

    if (!isCallOf(s, 'ts_project')) {
      continue;
    }

    const deps = s.X.Args.find(
      (a): a is Ast.BinaryExpr<Ast.Ident> => isKwArg(a) && a.X.Name === 'deps'
    );
    if (!deps) {
      throw new Error(`unable to find deps in ts_project() call within [${file.Path}]`);
    }

    let depsList;
    try {
      depsList = getListExprs(file, deps.Y);
    } catch (error) {
      throw new Error(
        `"deps" of ts_project() call do not resolve to a list expression in [${file.Path}]: ${error.stack}`
      );
    }

    return depsList.flatMap((i) => {
      const value = resolveIdent(file, i);

      if (!Ast.isLiteral(value) || typeof value.Value !== 'string') {
        throw new Error('invalid value in deps list, expected to find string literals');
      }

      const PREFIX = '//';
      const SUFFIX = ':npm_module_types';
      if (value.Value.startsWith(PREFIX) && value.Value.endsWith(SUFFIX)) {
        return value.Value.slice(PREFIX.length, -SUFFIX.length);
      }

      return [];
    });
  }

  throw new Error(`unable to find ts_project() call in [${file.Path}]`);
}
