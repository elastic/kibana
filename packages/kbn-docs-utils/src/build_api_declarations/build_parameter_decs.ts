/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ParameterDeclaration, JSDoc } from 'ts-morph';
import { SyntaxKind } from 'ts-morph';
import { extractImportReferences } from './extract_import_refs';
import type { ApiDeclaration, TextWithLinks } from '../types';
import { buildApiDeclaration } from './build_api_declaration';
import { buildBasicApiDeclaration } from './build_basic_api_declaration';
import type { BuildApiDecOpts } from './types';
import { buildApiId, getOptsForChild } from './utils';

/**
 * Cache for pre-parsed JSDoc parameter comments, keyed by normalized parameter name.
 */
type ParamCommentCache = Map<string, TextWithLinks>;

/**
 * Removes braces and all whitespace in a name for cache key normalization.
 */
const normalizeForCache = (name: string): string => name.replace(/[{}\s]/g, '');

/**
 * Removes braces and normalizes whitespace in a name.
 */
const cleanName = (name: string): string => name.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();

/**
 * Removes braces and all whitespace in a name for tight matching.
 */
const normalizeTight = (name: string): string =>
  name.replace(/[{}]/g, '').replace(/\s+/g, '').trim();

/**
 * Pre-parses all `@param` entries from JSDoc into a cache for efficient lookups.
 * This avoids re-parsing raw JSDoc text for each parameter in deep object structures.
 */
const buildParamCommentCache = (jsDocs: JSDoc[] | undefined): ParamCommentCache => {
  const cache: ParamCommentCache = new Map();

  if (!jsDocs) {
    return cache;
  }

  for (const jsDoc of jsDocs) {
    const text = jsDoc.getText();
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.replace(/^\s*\*\s?/, '');
      if (!trimmed.includes('@param')) {
        continue;
      }

      const body = trimmed.trim().replace(/^@param\s+/, '');
      const parts = body.split(/\s+/);
      if (parts.length === 0) {
        continue;
      }

      // Skip type annotation if present (e.g., "{string} paramName").
      let nameIndex = 0;
      if (parts[0].startsWith('{')) {
        while (nameIndex < parts.length && !parts[nameIndex].endsWith('}')) {
          nameIndex += 1;
        }
        nameIndex += 1;
      }

      const nameToken = parts[nameIndex];
      if (!nameToken) {
        continue;
      }

      const commentText = parts
        .slice(nameIndex + 1)
        .join(' ')
        .trim();
      if (commentText) {
        const normalizedKey = normalizeForCache(nameToken);
        cache.set(normalizedKey, [commentText]);
      }
    }
  }

  return cache;
};

/**
 * Generates candidate path strings for matching JSDoc parameter comments.
 * JSDoc can reference parameters in various formats, so we generate multiple variations.
 */
const generatePathCandidates = (path: string[]): string[] => {
  if (path.length === 0) {
    return [];
  }

  const candidates = new Set<string>();

  // Original path with dots
  candidates.add(path.join('.'));

  // Path with cleaned first element (normalized whitespace)
  const cleanedFirst = cleanName(path[0]);
  candidates.add([cleanedFirst, ...path.slice(1)].join('.'));

  // Path with all elements normalized tightly (no whitespace)
  const tightPath = path.map(normalizeTight).join('.');
  candidates.add(tightPath);

  // For single-element paths, also include the raw name
  if (path.length === 1) {
    candidates.add(path[0]);
  }

  return Array.from(candidates).filter(Boolean);
};

/**
 * Looks up a parameter comment from the cache using candidate path strings.
 */
const lookupParamComment = (
  cache: ParamCommentCache,
  path: string[]
): TextWithLinks | undefined => {
  const candidates = generatePathCandidates(path);
  for (const candidate of candidates) {
    const normalizedKey = normalizeForCache(candidate);
    const comment = cache.get(normalizedKey);
    if (comment) {
      return comment;
    }
  }
  return undefined;
};

/**
 * Applies JSDoc parameter comments to an API declaration and its children recursively.
 * Uses a pre-built cache to avoid re-parsing JSDoc text for each node.
 */
const applyParamComments = (
  apiDec: ApiDeclaration,
  cache: ParamCommentCache,
  path: string[]
): void => {
  if (cache.size === 0 || path.length === 0) {
    return;
  }

  const comment = lookupParamComment(cache, path);

  if (comment && comment.length > 0) {
    apiDec.description = comment;
  }

  // Recursively apply comments to children.
  if (apiDec.children) {
    apiDec.children.forEach((child) => {
      applyParamComments(child, cache, [...path, child.label]);
    });
  }
};

/**
 * Builds an API declaration for a single parameter.
 */
const buildParameterDeclaration = (
  param: ParameterDeclaration,
  index: number,
  parentOpts: BuildApiDecOpts,
  cache: ParamCommentCache
): ApiDeclaration => {
  const id = buildApiId(`$${index + 1}`, parentOpts.id);
  const opts = {
    ...getOptsForChild(param, parentOpts),
    id,
  };

  opts.log.debug(`Getting parameter doc def for ${opts.name} of kind ${param.getKindName()}`);

  const typeNode = param.getTypeNode();
  const isTypeLiteral = typeNode?.getKind() === SyntaxKind.TypeLiteral;

  // Type literals are inline object types that should be expanded with children.
  // Other types are handled as basic declarations with signatures.
  const apiDec = isTypeLiteral
    ? buildApiDeclaration(typeNode!, opts)
    : {
        ...buildBasicApiDeclaration(param, opts),
        isRequired: param.getType().isNullable() === false,
        signature: extractImportReferences(param.getType().getText(), opts.plugins, opts.log),
      };

  applyParamComments(apiDec, cache, [opts.name]);
  return apiDec;
};

/**
 * Builds API declarations for function parameters, whether from arrow functions,
 * regular functions, or function types.
 */
export const buildApiDecsForParameters = (
  params: ParameterDeclaration[],
  parentOpts: BuildApiDecOpts,
  jsDocs?: JSDoc[]
): ApiDeclaration[] => {
  const cache = buildParamCommentCache(jsDocs);
  return params.map((param, index) => buildParameterDeclaration(param, index, parentOpts, cache));
};
