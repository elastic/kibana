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

const getIssueFromLeadingComment = (
  call: ts.CallExpression,
  source: ts.SourceFile
): string | undefined => {
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

/** Result of resolving one failure against a parsed spec file. */
export interface SkipLookup {
  /**
   * The skipped node covering the failure. Set only when every occurrence that can be the failed
   * test is covered by a skip and none of them sits under an unresolvable dynamic title.
   */
  skip: SuiteNode | undefined;
  /**
   * The failed test resolves to at least one node and every such node is runnable: none is
   * covered by a skip and none sits under an unresolvable dynamic title. Used to prove that a
   * skip found on another ref is new relative to this one.
   */
  allUnskipped: boolean;
}

/** One node that may be the failed test: covered by `skip`, or `null` when unresolvable. */
type Occurrence = SuiteNode | undefined | null;

/**
 * Collects, for every node matching `isMatch`, the nearest skipped ancestor (or `undefined`). A
 * title may occur more than once in a file; the caller forgives only when every occurrence is
 * skipped, since the failure cannot be attributed to one of them.
 *
 * A node with a dynamic title cannot match itself but its subtree is still walked, since the
 * runtime title may equal any reported one. With `chainThroughDynamic` the chain restarts below
 * such a node and every match under it is recorded as unresolvable (`null`): the reconstructed
 * chain cannot prove which node the failure came from, so it must stay real.
 */
const collectMatches = (
  nodes: SuiteNode[],
  chainThroughDynamic: boolean,
  isMatch: (
    node: SuiteNode,
    parent: SuiteNode | undefined,
    chain: string
  ) => boolean | 'unresolvable'
): Occurrence[] => {
  const matches: Occurrence[] = [];
  const walk = (
    children: SuiteNode[],
    parent: SuiteNode | undefined,
    parentChain: string | undefined,
    skippedAncestor: SuiteNode | undefined,
    unresolvable: boolean
  ) => {
    for (const node of children) {
      const skipped = skippedAncestor ?? (node.skipped ? node : undefined);
      if (node.title === null) {
        walk(
          node.children,
          node,
          chainThroughDynamic ? undefined : parentChain,
          skipped,
          unresolvable || chainThroughDynamic
        );
        continue;
      }
      const chain = parentChain === undefined ? node.title : `${parentChain} ${node.title}`;
      const match = isMatch(node, parent, chain);
      if (match) {
        matches.push(unresolvable || match === 'unresolvable' ? null : skipped);
      }
      walk(node.children, node, chain, skipped, unresolvable);
    }
  };
  walk(nodes, undefined, undefined, undefined, false);
  return matches;
};

const toLookup = (matches: Occurrence[]): SkipLookup => {
  const [first] = matches;
  return {
    skip: first && matches.every(Boolean) ? first : undefined,
    allUnskipped: matches.length > 0 && matches.every((match) => match === undefined),
  };
};

/**
 * Resolves a mocha full title (space-joined suite titles + test title, as written to JUnit `name`)
 * against the tree. Matches any suffix of the tree chain, since JUnit names may be prefixed with
 * titles from wrapping configs. Hook failures ("before all" hook for "x") are attributed to the
 * enclosing suite.
 *
 * `skip` is set only when every chain that is a suffix of the title is skipped: the
 * wrapping-config prefix is unknown, so no alignment can be preferred over another. A matching
 * chain below a dynamic title counts as an occurrence but is never skipped.
 */
export function findSkipForFullTitle(nodes: SuiteNode[], fullTitle: string): SkipLookup {
  const target = fullTitle.replace(HOOK_SUFFIX_RE, '');
  return toLookup(
    collectMatches(
      nodes,
      true,
      (_node, _parent, chain) => target === chain || target.endsWith(` ${chain}`)
    )
  );
}

/**
 * Resolves a Scout failure (immediate parent `suite` title + test `title`) against the tree.
 * Playwright reports the nearest describe only, so match on that pair anywhere in the tree and
 * check the ancestors. A test outside any describe has Playwright's synthetic file suite as its
 * parent, titled with the spec path relative to the config's `testDir`; such a `suite` is matched
 * against `file` (the repo-relative spec path) instead of a describe.
 *
 * `skip` is set only when every matching occurrence in the file is skipped. A test whose
 * describe has a dynamic title may be the failed one, so it counts as an occurrence that is
 * never skipped.
 */
export function findSkipForScoutFailure(
  nodes: SuiteNode[],
  suite: string,
  title: string,
  file: string
): SkipLookup {
  const isFileSuite = file === suite || file.endsWith(`/${suite}`);
  return toLookup(
    collectMatches(nodes, false, (node, parent) => {
      if (node.kind !== 'test' || node.title !== title) {
        return false;
      }
      if (parent === undefined) {
        return isFileSuite;
      }
      return parent.title === null ? 'unresolvable' : parent.title === suite;
    })
  );
}
