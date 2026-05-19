/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, writeFileSync, statSync } from 'fs';
import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { REPO_ROOT } from '@kbn/repo-info';

export const commitPropBodySchema = schema.object({
  file: schema.string({ minLength: 1 }),
  lineNumber: schema.number(),
  columnNumber: schema.number(),
  propName: schema.string({ minLength: 1 }),
  newValue: schema.oneOf([schema.string(), schema.number(), schema.boolean()]),
  originalMtime: schema.number(),
});

export type CommitPropBody = TypeOf<typeof commitPropBodySchema>;

type CommitPropResponse =
  | { ok: true; mtime: number }
  | {
      ok: false;
      error:
        | 'path_not_allowed'
        | 'file_changed_on_disk'
        | 'prop_not_found'
        | 'computed_value'
        | 'spread_only'
        | 'parse_error'
        | 'write_error';
    };

interface CommitPropOptions {
  req: KibanaRequest<unknown, unknown, CommitPropBody>;
  res: KibanaResponseFactory;
  logger: Logger;
}

/**
 * Surgically rewrites a single JSX attribute value in a source file using
 * AST-derived start/end byte offsets. Avoids running @babel/generator to
 * prevent reformatting unrelated lines.
 */
export const handleCommitProp = async ({
  req,
  res,
  logger,
}: CommitPropOptions): Promise<IKibanaResponse<CommitPropResponse>> => {
  const { file, lineNumber, propName, newValue, originalMtime } = req.body;

  // Reject writes outside the Kibana repo root.
  if (!file.startsWith(REPO_ROOT)) {
    return res.ok({ body: { ok: false, error: 'path_not_allowed' } });
  }

  // Mtime conflict detection.
  let currentMtime: number;
  try {
    currentMtime = statSync(file).mtimeMs;
  } catch (e) {
    logger.warn(`commitProp: cannot stat ${file}: ${e}`);
    return res.ok({ body: { ok: false, error: 'parse_error' } });
  }

  if (Math.abs(currentMtime - originalMtime) > 100) {
    return res.ok({ body: { ok: false, error: 'file_changed_on_disk' } });
  }

  let source: string;
  try {
    source = readFileSync(file, 'utf-8');
  } catch (e) {
    return res.ok({ body: { ok: false, error: 'parse_error' } });
  }

  // Parse and locate the attribute.
  let parse: typeof import('@babel/parser').parse;
  try {
    ({ parse } = await import('@babel/parser'));
  } catch (e) {
    return res.ok({ body: { ok: false, error: 'parse_error' } });
  }

  let ast: ReturnType<typeof parse>;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
      errorRecovery: true,
    });
  } catch (e) {
    logger.warn(`commitProp: parse failed for ${file}: ${e}`);
    return res.ok({ body: { ok: false, error: 'parse_error' } });
  }

  // Walk AST to find JSXOpeningElement at lineNumber, then find the prop.
  interface LocNode {
    type: string;
    loc?: { start: { line: number } };
    start?: number;
    end?: number;
    [key: string]: unknown;
  }

  let attrStart: number | undefined;
  let attrEnd: number | undefined;
  let foundSpread = false;
  let foundProp = false;
  let isComputed = false;
  // Set when we locate the JSXOpeningElement at lineNumber. Used to compute
  // the insertion point if the requested prop doesn't yet exist on this
  // element (the "add a new prop" case).
  let openingElementFound = false;
  let insertPos: number | undefined;

  const walkForAttr = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false;
    const n = node as LocNode;

    if (n.type === 'JSXOpeningElement') {
      const loc = n.loc;
      if (loc && loc.start.line === lineNumber) {
        openingElementFound = true;
        const attrs = n.attributes as LocNode[];
        for (const attr of attrs) {
          if (attr.type === 'JSXSpreadAttribute') {
            foundSpread = true;
            continue;
          }
          if (attr.type === 'JSXAttribute') {
            const attrName = attr.name as LocNode | undefined;
            const nameStr =
              attrName && typeof attrName.name === 'string' ? attrName.name : undefined;
            if (nameStr === propName) {
              foundProp = true;
              const value = attr.value as LocNode | undefined | null;
              if (!value) {
                // Bare boolean attribute (e.g. `compressed`). The whole attr is the range.
                attrStart = attr.start;
                attrEnd = attr.end;
              } else if (
                value.type === 'StringLiteral' ||
                value.type === 'JSXExpressionContainer'
              ) {
                if (value.type === 'JSXExpressionContainer') {
                  const expr = (value as { expression?: LocNode }).expression;
                  if (
                    expr &&
                    expr.type !== 'StringLiteral' &&
                    expr.type !== 'NumericLiteral' &&
                    expr.type !== 'BooleanLiteral'
                  ) {
                    isComputed = true;
                  }
                }
                attrStart = attr.start;
                attrEnd = attr.end;
              }
              return true; // stop walking
            }
          }
        }
        // Compute insertion point for a brand-new attribute. Prefer right
        // after the last existing attribute (most natural placement); if
        // there are none, place it right after the element name. Babel
        // guarantees both have `.end` set. The opening tag's `>` / `/>` is
        // strictly downstream of these positions, so we don't need to find
        // it ourselves.
        const lastAttr = attrs.length > 0 ? attrs[attrs.length - 1] : undefined;
        if (lastAttr && typeof lastAttr.end === 'number') {
          insertPos = lastAttr.end;
        } else {
          const nameNode = n.name as LocNode | undefined;
          if (nameNode && typeof nameNode.end === 'number') {
            insertPos = nameNode.end;
          }
        }
        return true; // found the opening element, stop walking
      }
    }

    for (const key of Object.keys(n)) {
      const child = n[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (walkForAttr(item)) return true;
        }
      } else if (child && typeof child === 'object' && (child as LocNode).type) {
        if (walkForAttr(child)) return true;
      }
    }
    return false;
  };

  walkForAttr(ast.program);

  if (isComputed) {
    return res.ok({ body: { ok: false, error: 'computed_value' } });
  }

  let newSource: string;

  if (foundProp && attrStart !== undefined && attrEnd !== undefined) {
    // UPDATE: existing attribute → replace its byte range.
    const replacement = buildReplacement(propName, newValue);
    newSource = source.slice(0, attrStart) + replacement + source.slice(attrEnd);
  } else if (openingElementFound && insertPos !== undefined) {
    // INSERT: requested prop doesn't exist on this opening element yet.
    // Splice ` propName=value` in at the computed position. `foundSpread`
    // doesn't block insertion — a component may legitimately accept spread
    // *and* explicit attributes side by side; the spread case only matters
    // when we're trying to UPDATE a non-existent named attribute.
    const replacement = ` ${buildReplacement(propName, newValue)}`;
    newSource = source.slice(0, insertPos) + replacement + source.slice(insertPos);
  } else if (foundSpread) {
    return res.ok({ body: { ok: false, error: 'spread_only' } });
  } else {
    return res.ok({ body: { ok: false, error: 'prop_not_found' } });
  }

  try {
    writeFileSync(file, newSource, 'utf-8');
  } catch (e) {
    logger.warn(`commitProp: write failed for ${file}: ${e}`);
    return res.ok({ body: { ok: false, error: 'write_error' } });
  }

  const newMtime = statSync(file).mtimeMs;
  logger.debug(`commitProp: wrote ${propName} in ${file}`);
  return res.ok({ body: { ok: true, mtime: newMtime } });
};

const buildReplacement = (propName: string, newValue: string | number | boolean): string => {
  if (typeof newValue === 'boolean') {
    // true → bare attribute; false → propName={false}
    return newValue ? propName : `${propName}={false}`;
  }
  if (typeof newValue === 'number') {
    return `${propName}={${newValue}}`;
  }
  // String: escape double quotes and wrap.
  const escaped = String(newValue).replace(/"/g, '\\"');
  return `${propName}="${escaped}"`;
};
