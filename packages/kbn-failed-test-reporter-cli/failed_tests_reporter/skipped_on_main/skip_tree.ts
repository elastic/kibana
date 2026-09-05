/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import ts from 'typescript';

/**
 * A `describe`/`it`/`test` call found in a spec file. `title` is null when the
 * first argument is not a plain string literal; such nodes never match a failure
 * (conservative: the failure stays a real failure).
 */
export interface SuiteNode {
  kind: 'describe' | 'test';
  title: string | null;
  skipped: boolean;
  /** GitHub issue URL from the comment directly above a skipped call, when present. */
  issue?: string;
  children: SuiteNode[];
}

const DESCRIBE_NAMES: Record<string, true> = { describe: true, xdescribe: true, context: true };
const TEST_NAMES: Record<string, true> = {
  it: true,
  xit: true,
  test: true,
  apiTest: true,
  spaceTest: true,
};
const SKIP_NAMES: Record<string, true> = { skip: true, fixme: true, xit: true, xdescribe: true };
const ISSUE_URL_RE = /https:\/\/github\.com\/elastic\/kibana\/issues\/\d+/;

/** `apiTest.describe.serial.skip` -> ['apiTest', 'describe', 'serial', 'skip'] */
const getCalleeNames = (expr: ts.Expression): string[] | undefined => {
  if (ts.isIdentifier(expr)) {
    return [expr.text];
  }
  if (ts.isPropertyAccessExpression(expr)) {
    const base = getCalleeNames(expr.expression);
    return base && [...base, expr.name.text];
  }
  return undefined;
};

const classifyCall = (
  call: ts.CallExpression
): { kind: SuiteNode['kind']; skipped: boolean } | undefined => {
  const names = getCalleeNames(call.expression);
  if (!names) {
    return undefined;
  }
  const [base] = names;
  const skipped = names.some((name) => SKIP_NAMES[name]);

  if (names.some((name) => DESCRIBE_NAMES[name])) {
    return { kind: 'describe', skipped };
  }
  if (TEST_NAMES[base]) {
    return { kind: 'test', skipped };
  }
  return undefined;
};

const getTitle = (call: ts.CallExpression): string | null => {
  const [first] = call.arguments;
  if (first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) {
    return first.text;
  }
  return null;
};

const getIssueFromLeadingComment = (call: ts.CallExpression, source: ts.SourceFile) => {
  let statement: ts.Node = call;
  while (statement.parent && !ts.isExpressionStatement(statement)) {
    statement = statement.parent;
  }
  const ranges = ts.getLeadingCommentRanges(source.text, statement.getFullStart()) ?? [];
  for (const range of ranges) {
    const match = source.text.slice(range.pos, range.end).match(ISSUE_URL_RE);
    if (match) {
      return match[0];
    }
  }
  return undefined;
};

/**
 * Parses a spec file into the tree of describe/test calls, recording which ones are skipped.
 * Works for FTR (mocha `describe`/`it`) and Scout (`test`/`apiTest`/`spaceTest` + `.describe`).
 */
export function parseSuiteTree(source: string, fileName = 'spec.ts'): SuiteNode[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const roots: SuiteNode[] = [];

  const visit = (node: ts.Node, siblings: SuiteNode[]) => {
    if (ts.isCallExpression(node)) {
      const classified = classifyCall(node);
      if (classified) {
        const suiteNode: SuiteNode = {
          ...classified,
          title: getTitle(node),
          children: [],
        };
        if (classified.skipped) {
          suiteNode.issue = getIssueFromLeadingComment(node, sourceFile);
        }
        siblings.push(suiteNode);
        node.arguments.forEach((arg) => visit(arg, suiteNode.children));
        return;
      }
    }
    ts.forEachChild(node, (child) => visit(child, siblings));
  };

  visit(sourceFile, roots);
  return roots;
}

const HOOK_SUFFIX_RE = / "(?:before|after) (?:all|each)" hook\b.*$/;

/**
 * Whether a mocha full title (space-joined suite titles + test title, as written to JUnit `name`)
 * resolves through a skipped node. FTR full titles start with the suites of the parent
 * `index.ts` files that `loadTestFile` this one, which are unknown here; the part we do know is
 * the tail, so a root-to-node chain from this file must match the *end* of the full title. Hook
 * failures (`... "before all" hook: ...`) resolve to the suite they belong to, so a skipped
 * ancestor covers them as well.
 */
export function findSkipForFullTitle(nodes: SuiteNode[], fullTitle: string): SuiteNode | undefined {
  const target = fullTitle.replace(HOOK_SUFFIX_RE, '');

  const walk = (
    children: SuiteNode[],
    parentChain: string | undefined,
    skippedAncestor: SuiteNode | undefined
  ): SuiteNode | undefined => {
    for (const node of children) {
      if (node.title === null) {
        continue;
      }
      const chain = parentChain === undefined ? node.title : `${parentChain} ${node.title}`;
      const skipped = skippedAncestor ?? (node.skipped ? node : undefined);
      if (skipped && (target === chain || target.endsWith(` ${chain}`))) {
        return skipped;
      }
      const match = walk(node.children, chain, skipped);
      if (match) {
        return match;
      }
    }
    return undefined;
  };
  return walk(nodes, undefined, undefined);
}

/**
 * Whether a Scout failure (immediate parent `suite` title + test `title`) resolves through a
 * skipped node. Playwright reports the nearest describe only, so match on that pair anywhere
 * in the tree and check the ancestors.
 */
export function findSkipForScoutFailure(
  nodes: SuiteNode[],
  suite: string,
  title: string
): SuiteNode | undefined {
  const walk = (
    children: SuiteNode[],
    parent: SuiteNode | undefined,
    skippedAncestor: SuiteNode | undefined
  ): SuiteNode | undefined => {
    for (const node of children) {
      const skipped = skippedAncestor ?? (node.skipped ? node : undefined);
      if (node.kind === 'test' && node.title === title && parent?.title === suite && skipped) {
        return skipped;
      }
      const match = walk(node.children, node, skipped);
      if (match) {
        return match;
      }
    }
    return undefined;
  };
  return walk(nodes, undefined, undefined);
}
