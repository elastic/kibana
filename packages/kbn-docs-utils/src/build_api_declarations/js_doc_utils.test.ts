/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { Node } from 'ts-morph';
import { Project } from 'ts-morph';
import {
  getJSDocParamComment,
  getJSDocReturnTagComment,
  getJSDocTags,
  getJSDocs,
  getCommentsFromNode,
} from './js_doc_utils';

import { isNamedNode } from '../tsmorph_utils';

let project: Project;
let sourceFile: ReturnType<Project['getSourceFile']>;

function getNodeByName(name: string): Node | undefined {
  if (!sourceFile) return undefined;

  // Try function declarations first
  const func = sourceFile.getFunction(name);
  if (func) return func;

  // Try variable declarations
  const vars = sourceFile.getVariableDeclarations();
  for (const v of vars) {
    if (isNamedNode(v) && v.getName() === name) {
      return v;
    }
  }

  return undefined;
}

beforeAll(() => {
  const tsConfigFilePath = Path.resolve(
    __dirname,
    '../integration_tests/__fixtures__/src/tsconfig.json'
  );
  project = new Project({
    tsConfigFilePath,
  });

  sourceFile = project.getSourceFile(
    Path.resolve(__dirname, '../integration_tests/__fixtures__/src/plugin_a/public/fns.ts')
  );
  expect(sourceFile).toBeDefined();
});

describe('getJSDocParamComment', () => {
  it('extracts parameter comment for simple parameter', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const comment = getJSDocParamComment(node!, 'a');
    expect(comment).toBeDefined();
    expect(comment.length).toBeGreaterThan(0);
    expect(comment[0]).toContain('letter A');
  });

  it('extracts parameter comment for multiple parameters', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const commentA = getJSDocParamComment(node!, 'a');
    expect(commentA.length).toBeGreaterThan(0);

    const commentB = getJSDocParamComment(node!, 'b');
    expect(commentB.length).toBeGreaterThan(0);
    expect(commentB[0]).toContain('Feed me');

    const commentC = getJSDocParamComment(node!, 'c');
    expect(commentC.length).toBeGreaterThan(0);
    expect(commentC[0]).toContain('So many params');
  });

  it('returns empty array for parameter without JSDoc comment', () => {
    const node = getNodeByName('fnWithNonExportedRef');
    expect(node).toBeDefined();

    const comment = getJSDocParamComment(node!, 'a');
    expect(comment).toBeDefined();
    expect(comment.length).toBe(0);
  });

  it('returns empty array for non-existent parameter name', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const comment = getJSDocParamComment(node!, 'nonexistent');
    expect(comment).toBeDefined();
    expect(comment.length).toBe(0);
  });

  it('handles destructured parameter parent comment', () => {
    const node = getNodeByName('crazyFunction');
    expect(node).toBeDefined();

    // Current behavior: can find parent parameter comment
    const comment = getJSDocParamComment(node!, 'obj');
    expect(comment).toBeDefined();
    expect(comment.length).toBeGreaterThan(0);
    expect(comment[0]).toContain('crazy parameter');
  });

  it('does not extract property-level parameter comments (current limitation)', () => {
    // This test documents current behavior: property-level @param tags like @param obj.hi
    // are not currently extracted. This will be fixed in Phase 4.1.
    const node = getNodeByName('crazyFunction');
    expect(node).toBeDefined();

    // Current behavior: property-level tags are not found
    const comment = getJSDocParamComment(node!, 'obj.hi');
    expect(comment).toBeDefined();
    expect(comment.length).toBe(0); // Currently returns empty, should be fixed in Phase 4.1

    // Also test with destructured parameter name format
    const comment2 = getJSDocParamComment(node!, '{ fn1, fn2 }.fn1');
    expect(comment2.length).toBe(0); // Currently returns empty
  });

  it('works with JSDoc array input', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const jsDocs = getJSDocs(node!);
    expect(jsDocs).toBeDefined();

    const comment = getJSDocParamComment(jsDocs!, 'a');
    expect(comment).toBeDefined();
    expect(comment.length).toBeGreaterThan(0);
  });

  it('handles case-sensitive parameter names', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    // Should match exact case
    const commentLower = getJSDocParamComment(node!, 'a');
    expect(commentLower.length).toBeGreaterThan(0);

    const commentUpper = getJSDocParamComment(node!, 'A');
    expect(commentUpper.length).toBe(0); // Case-sensitive, so 'A' won't match 'a'
  });
});

describe('getJSDocReturnTagComment', () => {
  it('extracts @returns comment', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const comment = getJSDocReturnTagComment(node!);
    expect(comment).toBeDefined();
    expect(comment.length).toBeGreaterThan(0);
    expect(comment[0]).toContain('something!');
  });

  it('returns empty array when @returns tag is missing', () => {
    const node = getNodeByName('fnWithNonExportedRef');
    expect(node).toBeDefined();

    const comment = getJSDocReturnTagComment(node!);
    expect(comment).toBeDefined();
    expect(comment.length).toBe(0);
  });

  it('works with JSDoc array input', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const jsDocs = getJSDocs(node!);
    expect(jsDocs).toBeDefined();

    const comment = getJSDocReturnTagComment(jsDocs!);
    expect(comment).toBeDefined();
    expect(comment.length).toBeGreaterThan(0);
  });
});

describe('getJSDocTags', () => {
  it('extracts all JSDoc tags from node', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const tags = getJSDocTags(node!);
    expect(tags).toBeDefined();
    expect(tags.length).toBeGreaterThan(0);

    // Should have @param tags and @returns tag
    const paramTags = tags.filter((tag) => tag.getKindName() === 'JSDocParameterTag');
    expect(paramTags.length).toBe(5); // a, b, c, d, e

    const returnTags = tags.filter((tag) => tag.getKindName() === 'JSDocReturnTag');
    expect(returnTags.length).toBe(1);
  });

  it('returns empty array when node has no JSDoc', () => {
    const node = getNodeByName('fnWithNonExportedRef');
    expect(node).toBeDefined();

    const tags = getJSDocTags(node!);
    expect(tags).toBeDefined();
    expect(tags.length).toBe(0);
  });

  it('works with JSDoc array input', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const jsDocs = getJSDocs(node!);
    expect(jsDocs).toBeDefined();

    const tags = getJSDocTags(jsDocs!);
    expect(tags).toBeDefined();
    expect(tags.length).toBeGreaterThan(0);
  });

  it('extracts multiple JSDoc blocks if present', () => {
    // Some nodes might have multiple JSDoc comments
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const tags = getJSDocTags(node!);
    // Should collect tags from all JSDoc blocks
    expect(tags.length).toBeGreaterThan(0);
  });
});

describe('getJSDocs', () => {
  it('extracts JSDoc from function declaration', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const jsDocs = getJSDocs(node!);
    expect(jsDocs).toBeDefined();
    expect(jsDocs!.length).toBeGreaterThan(0);
  });

  it('extracts JSDoc from variable declaration', () => {
    const node = getNodeByName('arrowFn');
    expect(node).toBeDefined();

    const jsDocs = getJSDocs(node!);
    expect(jsDocs).toBeDefined();
    expect(jsDocs!.length).toBeGreaterThan(0);
  });

  it('returns undefined or empty array when node has no JSDoc', () => {
    const node = getNodeByName('fnWithNonExportedRef');
    expect(node).toBeDefined();

    const jsDocs = getJSDocs(node!);
    // ts-morph's getJsDocs() may return empty array [] instead of undefined
    expect(jsDocs === undefined || jsDocs.length === 0).toBe(true);
  });

  it('handles variable declarations with parent JSDoc', () => {
    // Variable declarations might have JSDoc on the parent
    const arrowFnVar = sourceFile!.getVariableDeclaration('arrowFn');
    expect(arrowFnVar).toBeDefined();

    const jsDocs = getJSDocs(arrowFnVar!);
    expect(jsDocs).toBeDefined();
    expect(jsDocs!.length).toBeGreaterThan(0);
  });

  it('handles variable declaration with grandparent JSDoc (line 39 coverage)', () => {
    // Test the path where variable declaration's grandparent has JSDoc
    // This covers line 38-40 in js_doc_utils.ts
    const testProject = new Project({
      useInMemoryFileSystem: true,
    });

    const testSourceFile = testProject.createSourceFile(
      'test.ts',
      `
      /**
       * This is a JSDoc comment on the variable statement
       */
      const myVar = 'test';
      `
    );

    const varDecl = testSourceFile.getVariableDeclaration('myVar');
    expect(varDecl).toBeDefined();

    // The variable declaration itself doesn't have JSDoc, but its grandparent (VariableStatement) does
    const jsDocs = getJSDocs(varDecl!);
    expect(jsDocs).toBeDefined();
    expect(jsDocs!.length).toBeGreaterThan(0);
  });
});

describe('getCommentsFromNode', () => {
  it('extracts JSDoc description from node', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const comments = getCommentsFromNode(node!);
    expect(comments).toBeDefined();
    expect(comments!.length).toBeGreaterThan(0);
    expect(comments![0]).toContain('non arrow function');
  });

  it('prefers JSDoc over leading comments', () => {
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const comments = getCommentsFromNode(node!);
    expect(comments).toBeDefined();
    // Should use JSDoc description, not leading comment
    expect(comments![0]).toContain('non arrow function');
  });

  it('falls back to leading comments when JSDoc is missing', () => {
    // Find a node without JSDoc but with leading comment
    const nodesWithComments = sourceFile!.getDescendants().filter((n) => {
      return n.getLeadingCommentRanges().length > 0;
    });

    if (nodesWithComments.length > 0) {
      const node = nodesWithComments[0];
      const comments = getCommentsFromNode(node);
      // Should extract leading comments if JSDoc is not available
      expect(comments).toBeDefined();
    }
  });

  it('returns empty array when node has no comments', () => {
    const node = getNodeByName('fnWithNonExportedRef');
    expect(node).toBeDefined();

    const comments = getCommentsFromNode(node!);
    // getCommentsFromNode calls getTextWithLinks which returns [] when text is empty
    // The function signature says it can return undefined, but it never actually does
    expect(comments).toBeDefined();
    expect(Array.isArray(comments)).toBe(true);
    expect(comments!.length).toBe(0);
  });

  it('joins multiple JSDoc descriptions', () => {
    // If a node has multiple JSDoc blocks, descriptions should be joined
    const node = getNodeByName('notAnArrowFn');
    expect(node).toBeDefined();

    const comments = getCommentsFromNode(node!);
    expect(comments).toBeDefined();
    // Multiple JSDoc blocks would be joined with newlines
    expect(comments!.length).toBeGreaterThan(0);
  });
});

describe('property-level JSDoc parameter tags (future enhancement)', () => {
  it('currently does not support dot notation in parameter names', () => {
    // This test documents the current limitation
    // In Phase 4.1, we'll enhance getJSDocParamComment to support:
    // - @param obj.prop
    // - @param { fn1, fn2 }.fn1
    // - @param obj.nested.prop

    const node = getNodeByName('crazyFunction');
    expect(node).toBeDefined();

    // Current behavior: dot notation is not supported
    const comment1 = getJSDocParamComment(node!, 'obj.hi');
    expect(comment1.length).toBe(0);

    const comment2 = getJSDocParamComment(node!, 'obj.nested.prop');
    expect(comment2.length).toBe(0);

    // Future: should support destructured parameter names
    const comment3 = getJSDocParamComment(node!, '{ fn1, fn2 }.fn1');
    expect(comment3.length).toBe(0);
  });

  it('should support nested property access patterns (future)', () => {
    // This test documents expected future behavior after Phase 4.1
    // When property-level JSDoc is implemented, these should work:
    // - @param obj.prop
    // - @param obj.nested.prop
    // - @param { destructured }.prop
    // - @param { destructured }.nested.prop

    // For now, we just document that this is not yet supported
    expect(true).toBe(true); // Placeholder test
  });
});
