/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * NOTE: this file was copy-pasted and converted to TS from:
 *       https://github.com/seriousme/openapi-schema-validator/blob/v2.7.0/resolve.js
 */

import { isObject } from 'lodash';

const pointerWordsArray = [
  '$ref',
  '$id',
  '$anchor',
  '$dynamicRef',
  '$dynamicAnchor',
  '$schema',
] as const;

const pointerWords = new Set(pointerWordsArray);

type PointerWord = (typeof pointerWordsArray)[number];

export function checkRefs(tree: unknown) {
  try {
    resolve(tree, false);
    return { valid: true };
  } catch (err) {
    return { valid: false, errors: err.message };
  }
}

function escapeJsonPointer(str: string) {
  return str.replace(/~/g, '~0').replace(/\//g, '~1');
}

function unescapeJsonPointer(str: string) {
  return str.replace(/~1/g, '/').replace(/~0/g, '~');
}

interface PointerData {
  ref: string;
  obj: unknown;
  prop: string;
  path: string;
  id: string;
}

function resolveUri(uri: string, anchors: Record<string, unknown>) {
  const [prefix, path] = uri.split('#', 2) as [string, string | undefined];
  const hashPresent = !!path;
  const err = new Error(
    `Can't resolve ${uri}${prefix ? ', only internal refs are supported.' : ''}`
  );

  if (hashPresent && path[0] !== '/') {
    if (anchors[uri]) {
      return anchors[uri];
    }
    throw err;
  }

  if (!anchors[prefix]) {
    throw err;
  }

  if (!hashPresent) {
    return anchors[prefix];
  }

  const paths: string[] = path.split('/').slice(1);
  try {
    const result = paths.reduce(
      (o, n) => o[unescapeJsonPointer(n)] as Record<string, unknown>,
      anchors[prefix] as Record<string, unknown>
    );

    if (result === undefined) {
      throw new Error('Result is undefined');
    }
    return result;
  } catch (_) {
    throw err;
  }
}

export function resolve(tree: unknown, replace: boolean) {
  let treeObj = tree;
  if (!isObject(tree)) {
    return undefined;
  }

  if (replace === false) {
    treeObj = structuredClone(tree);
  }

  const pointers: Record<string, PointerData[]> = {};
  for (const word of pointerWords) {
    pointers[word] = [];
  }

  function applyRef(path: string, target: Record<string, unknown>) {
    let root = treeObj as Record<string, unknown>;
    const paths = path.split('/').slice(1);
    const prop = paths.pop();
    for (const p of paths) {
      root = root[unescapeJsonPointer(p)] as Record<string, unknown>;
    }
    if (typeof prop !== 'undefined') {
      root[unescapeJsonPointer(prop)] = target;
    } else {
      treeObj = target;
    }
  }

  function parse(obj: Record<string, unknown>, path: string, id: string) {
    if (!isObject(obj)) {
      return;
    }

    const objId = (obj.$id || id) as string;
    for (const prop of Object.keys(obj)) {
      if (pointerWords.has(prop as PointerWord)) {
        const pointerWord = prop as PointerWord;
        pointers[pointerWord].push({
          ref: obj[prop] as string,
          obj,
          prop: pointerWord,
          path,
          id: objId,
        });
        delete obj[prop];
      }
      parse(obj[prop] as Record<string, unknown>, `${path}/${escapeJsonPointer(prop)}`, objId);
    }
  }
  // find all refs
  parse(treeObj as Record<string, unknown>, '#', '');

  const anchors: Record<string, unknown> = { '': treeObj };
  const dynamicAnchors: Record<string, Record<string, unknown>> = {};

  for (const item of pointers.$id) {
    const { ref, obj, path } = item;
    if (anchors[ref]) {
      throw new Error(`$id : '${ref}' defined more than once at ${path}`);
    }
    anchors[ref] = obj;
  }

  for (const item of pointers.$anchor) {
    const { ref, obj, path, id } = item;
    const fullRef = `${id}#${ref}`;
    if (anchors[fullRef]) {
      throw new Error(`$anchor : '${ref}' defined more than once at '${path}'`);
    }
    anchors[fullRef] = obj;
  }

  for (const item of pointers.$dynamicAnchor) {
    const { ref, obj, path } = item;
    if (dynamicAnchors[`#${ref}`]) {
      throw new Error(`$dynamicAnchor : '${ref}' defined more than once at '${path}'`);
    }
    dynamicAnchors[`#${ref}`] = obj as Record<string, unknown>;
  }

  for (const item of pointers.$ref) {
    const { ref, id, path } = item;
    const decodedRef = decodeURIComponent(ref);
    const fullRef = decodedRef[0] !== '#' ? decodedRef : `${id}${decodedRef}`;
    applyRef(path, resolveUri(fullRef, anchors) as Record<string, unknown>);
  }

  for (const item of pointers.$dynamicRef) {
    const { ref, path } = item;
    if (!dynamicAnchors[ref]) {
      throw new Error(`Can't resolve $dynamicAnchor : '${ref}'`);
    }
    applyRef(path, dynamicAnchors[ref]);
  }

  return treeObj;
}
