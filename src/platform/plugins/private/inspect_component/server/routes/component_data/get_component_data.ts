/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, statSync } from 'fs';
import { sep } from 'path';
import type { TypeOf } from '@kbn/config-schema';
import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { REPO_ROOT } from '@kbn/repo-info';
import { schema } from '@kbn/config-schema';
import { getComponentCodeowners } from '../../lib/codeowners/get_component_codeowners';

export const getComponentDataBodySchema = schema.object({
  path: schema.string({
    minLength: 1,
  }),
  lineNumber: schema.maybe(schema.number()),
  columnNumber: schema.maybe(schema.number()),
});

export type GetComponentDataRequestBody = TypeOf<typeof getComponentDataBodySchema>;

/**
 * Options for {@link getComponentData}.
 */
interface GetComponentDataOptions {
  /** {@link KibanaRequest} */
  req: KibanaRequest<unknown, unknown, GetComponentDataRequestBody>;
  /** {@link KibanaResponseFactory} */
  res: KibanaResponseFactory;
  /** {@link Logger} */
  logger: Logger;
}

/**
 * Response structure for {@link getComponentData}.
 */
export interface GetComponentDataResponse {
  /** List of codeowners for the component. */
  codeowners: string[];
  /** Path relative to the repo root. */
  relativePath: string;
  /** File name with extension. */
  baseFileName: string;
  /** Prop names explicitly set in the JSX source at the given line. */
  explicitProps: string[];
  /** File modification time in milliseconds since epoch. */
  mtime: number;
}

/**
 * Recursively walks a Babel AST node and returns prop names from the first
 * JSXOpeningElement found at the given 1-indexed line number.
 */
const extractJsxPropsAtLine = (node: unknown, targetLine: number): string[] | null => {
  if (!node || typeof node !== 'object') return null;
  const n = node as Record<string, unknown>;

  if (n.type === 'JSXOpeningElement') {
    const loc = n.loc as { start: { line: number } } | undefined;
    if (loc && loc.start.line === targetLine) {
      const attrs = n.attributes as Array<Record<string, unknown>>;
      return attrs
        .filter((attr) => attr.type === 'JSXAttribute' && attr.name)
        .map((attr) => {
          const name = attr.name as Record<string, unknown>;
          return typeof name.name === 'string' ? name.name : String(name.name);
        });
    }
  }

  const results: string[] = [];
  for (const key of Object.keys(n)) {
    const child = n[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = extractJsxPropsAtLine(item, targetLine);
        if (found !== null) return found;
      }
    } else if (child && typeof child === 'object' && (child as Record<string, unknown>).type) {
      const found = extractJsxPropsAtLine(child, targetLine);
      if (found !== null) return found;
    }
  }
  return results.length > 0 ? results : null;
};

/**
 * Get data about a component at a given path.
 * @async
 * @internal
 */
export const getComponentData = async ({
  req,
  res,
  logger,
}: GetComponentDataOptions): Promise<IKibanaResponse<GetComponentDataResponse>> => {
  const { path, lineNumber, columnNumber: _columnNumber } = req.body;

  logger.debug(`Inspecting component at path: ${path}`);

  const relativePath = path.slice(REPO_ROOT.length + sep.length);
  const baseFileName = relativePath.split(sep).pop() || '';

  const codeowners = getComponentCodeowners(relativePath);

  let mtime = 0;
  let explicitProps: string[] = [];

  try {
    const stats = statSync(path);
    mtime = stats.mtimeMs;

    if (lineNumber !== undefined) {
      const source = readFileSync(path, 'utf-8');
      // Dynamic import to avoid loading babel into every server process
      const { parse } = await import('@babel/parser');
      const ast = parse(source, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        errorRecovery: true,
      });
      const found = extractJsxPropsAtLine(ast.program, lineNumber);
      if (found) explicitProps = found;
    }
  } catch (e) {
    logger.debug(`Failed to extract component metadata from ${path}: ${e}`);
  }

  return res.ok<GetComponentDataResponse>({
    body: { codeowners, relativePath, baseFileName, explicitProps, mtime },
  });
};
