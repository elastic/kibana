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

// Swagger 2.0 keeps reusable parts in root sections, and has no section for the others.
const SWAGGER2_SECTIONS: Readonly<Record<string, string>> = {
  parameters: 'parameters',
  responses: 'responses',
  schemas: 'definitions',
  securitySchemes: 'securityDefinitions',
};

const containerOf = (swagger2: boolean, section: string): string[] | undefined => {
  if (!swagger2) {
    return ['components', section];
  }
  const container = SWAGGER2_SECTIONS[section];
  return container === undefined ? undefined : [container];
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
  const swagger2 = document.swagger === '2.0';
  const loaded = new Map<string, Promise<unknown>>([[rootUrl, Promise.resolve(document)]]);
  const refs = new Map<string, string>();
  const sections = swagger2
    ? Object.keys(SWAGGER2_SECTIONS)
    : Object.keys(isJsonObject(document.components) ? document.components : {});
  const taken = new Set(
    sections.flatMap((section) => {
      const container = containerOf(swagger2, section);
      const entries = container && getAtTokens(document, container);
      return Object.keys(isJsonObject(entries) ? entries : {}).map((name) => `${section}/${name}`);
    })
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

  const sectionAndToken = ({ tokens }: RefTarget, trail: readonly string[]) => {
    if (tokens[0] === 'components' && tokens.length === 3) {
      return [tokens[1], tokens[2]];
    }
    if (tokens.length === 2) {
      const section = Object.keys(SWAGGER2_SECTIONS).find(
        (candidate) => SWAGGER2_SECTIONS[candidate] === tokens[0]
      );
      if (section !== undefined) {
        return [section, tokens[1]];
      }
    }
    return [sectionFor(trail), tokens[tokens.length - 1]];
  };

  /** The local ref the target is inlined at, or undefined when it has no section to go into. */
  const componentRefFor = async (
    target: RefTarget,
    ref: string,
    trail: readonly string[]
  ): Promise<string | undefined> => {
    const key = `${target.url}#${toPointer(target.tokens)}`;
    const existing = refs.get(key);
    if (existing) {
      return existing;
    }
    const [section, token] = sectionAndToken(target, trail);
    const container = containerOf(swagger2, section);
    if (container === undefined) {
      return undefined;
    }
    const directory = fileStem(target.url, true);
    const name =
      token === undefined
        ? uniqueName(section, toName(fileStem(target.url)), toName(directory))
        : uniqueName(section, toName(token), toName(`${directory}_${token}`));
    const componentRef = `#${toPointer([...container, name])}`;
    taken.add(`${section}/${name}`);
    refs.set(key, componentRef);
    const value = await resolve(target, ref, trail);
    setAtTokens(added, [section, name], await bundle(value, target.url, [...container, name]));
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
      const componentRef = isPathItem(trail)
        ? undefined
        : await componentRefFor(target, ref, trail);
      return componentRef === undefined
        ? bundle(await resolve(target, ref, trail), target.url, trail)
        : { ...node, $ref: componentRef };
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
  for (const [section, entries] of Object.entries(added)) {
    const container = containerOf(swagger2, section) ?? [];
    const current = getAtTokens(result, container);
    setAtTokens(result, container, {
      ...(isJsonObject(current) ? current : {}),
      ...(entries as JsonObject),
    });
  }
  return result;
};
