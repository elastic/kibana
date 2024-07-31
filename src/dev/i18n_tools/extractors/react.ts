/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import ts from 'typescript';
type TypeScript = typeof ts;
import { extractMessageDescriptor } from './call_expt';

export function isSingularMessageDecl(
  typescript: TypeScript,
  node: ts.CallExpression | ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  additionalComponentNames: string[]
) {
  const compNames = new Set(['FormattedMessage']);

  let fnName = '';
  if (typescript.isCallExpression(node) && typescript.isIdentifier(node.expression)) {
    fnName = node.expression.text;
  } else if (typescript.isJsxOpeningElement(node) && typescript.isIdentifier(node.tagName)) {
    fnName = node.tagName.text;
  } else if (typescript.isJsxSelfClosingElement(node) && typescript.isIdentifier(node.tagName)) {
    fnName = node.tagName.text;
  }
  return compNames.has(fnName);
}

type Opts = any;

export function extractMessageFromJsxComponent(
  typescript: TypeScript,
  factory: ts.NodeFactory,
  node: ts.JsxSelfClosingElement,
  opts: Opts,
  sf: ts.SourceFile
): ts.VisitResult<ts.JsxSelfClosingElement>;
export function extractMessageFromJsxComponent(
  typescript: TypeScript,
  factory: ts.NodeFactory,
  node: ts.JsxOpeningElement,
  opts: Opts,
  sf: ts.SourceFile
): ts.VisitResult<ts.JsxOpeningElement>;
export function extractMessageFromJsxComponent(
  typescript: TypeScript,
  factory: ts.NodeFactory,
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
  opts: Opts,
  sf: ts.SourceFile
): ts.VisitResult<typeof node> {
  const { onMsgWithValuesExtracted } = opts;
  if (!isSingularMessageDecl(typescript, node, opts.additionalComponentNames || [])) {
    return node;
  }
  const msg = extractMessageDescriptor(typescript, node, opts, sf);

  if (!msg) {
    return node;
  }
  if (msg.hasValuesObject || (msg.ignoreTag && typeof onMsgWithValuesExtracted === 'function')) {
    onMsgWithValuesExtracted(sf.fileName, [msg]);
  }

  return node;
}
