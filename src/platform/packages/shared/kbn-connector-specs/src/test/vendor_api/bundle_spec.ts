/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '@kbn/connector-contract-mock';
import type { JsonObject } from './json_pointer';
import { getAtTokens, isJsonObject, setAtTokens, toPointer, toTokens } from './json_pointer';

/** Loads and parses the document at a URL (without fragment). */
export type LoadDocument = (url: string) => Promise<unknown>;

export interface BundleOptions {
  /** The document's own URL, which relative refs resolve against. */
  readonly url: string;
  readonly load: LoadDocument;
}

interface RefTarget {
  readonly url: string;
  readonly tokens: string[];
}

// Where a ref stands decides the components section its target goes into, when the target
// isn't already a component of the other document.
const NAMED_SECTIONS: Readonly<Record<string, string>> = {
  callbacks: 'callbacks',
  examples: 'examples',
  headers: 'headers',
  links: 'links',
  parameters: 'parameters',
  requestBodies: 'requestBodies',
  responses: 'responses',
  schemas: 'schemas',
  securitySchemes: 'securitySchemes',
};

const sectionFor = (trail: readonly string[]): string => {
  const last = trail[trail.length - 1] ?? '';
  const parent = trail[trail.length - 2] ?? '';
  const grandparent = trail[trail.length - 3] ?? '';
  if (last === 'requestBody') {
    return 'requestBodies';
  }
  if (parent === 'parameters' && /^\d+$/.test(last)) {
    return 'parameters';
  }
  return grandparent !== 'properties' && parent in NAMED_SECTIONS
    ? NAMED_SECTIONS[parent]
    : 'schemas';
};

// Path items can't be components in OpenAPI 3.0, so refs to them are inlined where they stand.
const isPathItem = (trail: readonly string[]): boolean =>
  trail.length === 2 && (trail[0] === 'paths' || trail[0] === 'webhooks');

const toName = (value: string): string => value.replace(/[^A-Za-z0-9._-]+/g, '_') || 'Component';

/** The file name without extension, preceded by its directory with `withDirectory`. */
const fileStem = (url: string, withDirectory = false): string =>
  new URL(url).pathname
    .split('/')
    .filter(Boolean)
    .slice(withDirectory ? -2 : -1)
    .join('_')
    .replace(/\.[^.]*$/, '');

const toTarget = (ref: string, base: string): RefTarget => {
  const resolved = new URL(ref, base);
  const tokens = toTokens(decodeURIComponent(resolved.hash.slice(1)));
  resolved.hash = '';
  return { url: resolved.href, tokens };
};

/**
 * Inlines the external `$ref`s of an OpenAPI document into its `components`, following refs in
 * the inlined parts too (relative to their own document) and cycles, so the result is one
 * self-contained document. Targets keep their component name when they have one, otherwise
 * they are named after the ref's last token or the file; names that collide get the file's
 * path as a prefix.
 */
export const bundleSpec = async (
  document: OpenApiDocument,
  { url, load }: BundleOptions
): Promise<OpenApiDocument> => {
  const rootUrl = toTarget('', url).url;
  const loaded = new Map<string, Promise<unknown>>([[rootUrl, Promise.resolve(document)]]);
  const refs = new Map<string, string>();
  const rootComponents = isJsonObject(document.components) ? document.components : {};
  const taken = new Set(
    Object.entries(rootComponents).flatMap(([section, entries]) =>
      Object.keys(isJsonObject(entries) ? entries : {}).map((name) => `${section}/${name}`)
    )
  );
  // Inlined components, by section; merged into the result once the walk is done.
  const added: JsonObject = {};

  const loadDocument = (documentUrl: string): Promise<unknown> => {
    const pending = loaded.get(documentUrl) ?? load(documentUrl);
    loaded.set(documentUrl, pending);
    return pending;
  };

  const resolve = async (target: RefTarget, ref: string, trail: readonly string[]) => {
    let source: unknown;
    try {
      source = await loadDocument(target.url);
    } catch (error) {
      throw new Error(
        `Cannot load ${target.url} for $ref ${ref} at ${toPointer(trail)}: ${
          (error as Error).message
        }`
      );
    }
    const value = getAtTokens(source, target.tokens);
    if (value === undefined) {
      throw new Error(`Cannot resolve $ref ${ref} at ${toPointer(trail)}`);
    }
    return structuredClone(value);
  };

  const uniqueName = (section: string, base: string, fallback: string): string => {
    const candidates = [base, fallback];
    for (let index = 2; candidates.every((name) => taken.has(`${section}/${name}`)); index++) {
      candidates.push(`${fallback}_${index}`);
    }
    return candidates.find((name) => !taken.has(`${section}/${name}`)) ?? fallback;
  };

  const componentRefFor = async (target: RefTarget, ref: string, trail: readonly string[]) => {
    const key = `${target.url}#${toPointer(target.tokens)}`;
    const existing = refs.get(key);
    if (existing) {
      return existing;
    }
    const { tokens } = target;
    const [section, token] =
      tokens[0] === 'components' && tokens.length === 3
        ? [tokens[1], tokens[2]]
        : tokens[0] === 'definitions' && tokens.length === 2
        ? ['schemas', tokens[1]]
        : [sectionFor(trail), tokens[tokens.length - 1]];
    const directory = fileStem(target.url, true);
    const name =
      token === undefined
        ? uniqueName(section, toName(fileStem(target.url)), toName(directory))
        : uniqueName(section, toName(token), toName(`${directory}_${token}`));
    const componentRef = `#${toPointer(['components', section, name])}`;
    taken.add(`${section}/${name}`);
    refs.set(key, componentRef);
    const value = await resolve(target, ref, trail);
    setAtTokens(
      added,
      [section, name],
      await bundle(value, target.url, ['components', section, name])
    );
    return componentRef;
  };

  const bundle = async (
    node: unknown,
    base: string,
    trail: readonly string[]
  ): Promise<unknown> => {
    if (Array.isArray(node)) {
      const items: unknown[] = [];
      for (const [index, item] of node.entries()) {
        items.push(await bundle(item, base, [...trail, String(index)]));
      }
      return items;
    }
    if (!isJsonObject(node)) {
      return node;
    }
    const { $ref: ref } = node;
    if (typeof ref === 'string') {
      const target = toTarget(ref, base);
      if (target.url === rootUrl) {
        return base === rootUrl ? { ...node } : { ...node, $ref: `#${toPointer(target.tokens)}` };
      }
      if (isPathItem(trail)) {
        return bundle(await resolve(target, ref, trail), target.url, trail);
      }
      return { ...node, $ref: await componentRefFor(target, ref, trail) };
    }
    const result: JsonObject = {};
    for (const [key, child] of Object.entries(node)) {
      result[key] = await bundle(child, base, [...trail, key]);
    }
    return result;
  };

  const result = (await bundle(document, rootUrl, [])) as JsonObject;
  if (Object.keys(added).length === 0) {
    return result;
  }
  const components = isJsonObject(result.components) ? { ...result.components } : {};
  for (const [section, entries] of Object.entries(added)) {
    const current = components[section];
    components[section] = { ...(isJsonObject(current) ? current : {}), ...(entries as JsonObject) };
  }
  return { ...result, components };
};
