/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { VisitNode, VisitNodeFunction, VisitNodeObject } from '@babel/traverse';
import type t from '@babel/types';
import { ObjectProperty } from '@babel/types';
import type { Overwrite } from 'utility-types';

export type CommonJSExportAssignmentExpression = Overwrite<
  t.AssignmentExpression,
  {
    left: Overwrite<
      t.MemberExpression,
      {
        object:
          | Overwrite<t.Identifier, { name: 'exports' }> // exports.foo
          | Overwrite<t.Identifier, { name: 'module' }> // module.exports
          | Overwrite<
              t.MemberExpression,
              {
                object: Overwrite<t.Identifier, { name: 'module' }>;
                property: Overwrite<t.Identifier, { name: 'exports' }>;
              }
            >;
      }
    >;
  }
>;

export type RequireLikeCallExpression<TCallee extends t.Identifier | t.Import> = Overwrite<
  t.CallExpression,
  {
    callee: TCallee;
    arguments: [t.StringLiteral, ...t.CallExpression['arguments']];
  }
>;

export type RequireLikeDeclaration<TCallee extends t.Identifier | t.Import> = Overwrite<
  t.VariableDeclaration,
  {
    declarations: Array<
      Overwrite<
        t.VariableDeclarator,
        {
          id: Overwrite<
            t.ObjectPattern,
            { properties: Array<Overwrite<ObjectProperty, { key: t.Identifier }>> }
          >;
          init:
            | RequireLikeCallExpression<TCallee>
            | (TCallee extends t.Import
                ? Overwrite<
                    t.AwaitExpression,
                    {
                      argument: RequireLikeCallExpression<TCallee>;
                    }
                  >
                : never);
        }
      >
    >;
  }
>;

export type RequireDeclaration = RequireLikeDeclaration<t.Identifier>;
export type DynamicImportDeclaration = RequireLikeDeclaration<t.Import>;
export type RequireExpression = RequireLikeCallExpression<t.Identifier>;
export type DynamicImportExpression = RequireLikeCallExpression<t.Import>;
export type JestMockExpression = RequireLikeCallExpression<t.Identifier>;

export interface DependencyTraverseOptions<S = unknown> {
  RequireDeclaration: VisitNode<S, RequireDeclaration>;
  DynamicImportDeclaration: VisitNode<S, DynamicImportDeclaration>;
  RequireExpression: VisitNode<S, RequireExpression>;
  DynamicImportExpression: VisitNode<S, DynamicImportExpression>;
  CommonJSExport: VisitNode<S, CommonJSExportAssignmentExpression>;
  ImportDeclaration: VisitNode<S, t.ImportDeclaration>;
  ExportNamedDeclaration: VisitNode<S, t.ExportNamedDeclaration>;
  ExportDefaultDeclaration: VisitNode<S, t.ExportDefaultDeclaration>;
  ExportAllDeclaration: VisitNode<S, t.ExportAllDeclaration>;
  Jest: VisitNode<S, JestMockExpression>;
}

export type DependencyTraverseOptionsAsFunctions<S = unknown> = {
  [key in keyof DependencyTraverseOptions<S>]: DependencyTraverseOptions<S>[key] extends VisitNode<
    S,
    infer TNode
  >
    ? VisitNodeFunction<S, TNode>
    : never;
};
export type DependencyTraverseOptionsAsObjects<S = unknown> = {
  [key in keyof DependencyTraverseOptions<S>]: DependencyTraverseOptions<S>[key] extends VisitNode<
    S,
    infer TNode
  >
    ? VisitNodeObject<S, TNode>
    : never;
};
