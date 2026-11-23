/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The type of the field an `oasdiff` change is about, read from the snapshot it is in: `string`,
 * `boolean | string | SlotContentId`, `Features[]`. `oasdiff` names the field by a path through the
 * operation's schema (`document/allOf[subschema #1]/children/items/…/value`), and this follows
 * that path in the committed snapshot (for what was removed) or the refreshed one.
 *
 * A path that can't be followed, because it goes through an ambiguity or a shape this doesn't
 * know, gives no type rather than a guess.
 */

import type { SpecChange } from './detect_drift';
import { isRecord } from '../values';

type Json = Record<string, unknown>;

export interface SnapshotDocuments {
  /** The snapshot as committed. */
  readonly committed?: unknown;
  /** The snapshot regenerated from the latest vendor spec. */
  readonly current?: unknown;
}

const MAX_DEPTH = 24;
const MAX_TYPE_DEPTH = 4;
const MAX_LISTED_TYPES = 6;
const MAX_TYPE_LENGTH = 80;

const quoted = (text: string): string[] => [...text.matchAll(/`([^`]+)`/g)].map(([, name]) => name);

const pointer = (document: Json, ref: string): unknown =>
  ref.startsWith('#/')
    ? ref
        .slice(2)
        .split('/')
        .map((part) => decodeURIComponent(part).replace(/~1/g, '/').replace(/~0/g, '~'))
        .reduce<unknown>((node, part) => (isRecord(node) ? node[part] : undefined), document)
    : undefined;

const deref = (document: Json, node: unknown): unknown => {
  let current = node;
  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    if (!isRecord(current) || typeof current.$ref !== 'string') {
      return current;
    }
    current = pointer(document, current.$ref);
  }
  return undefined;
};

const refName = (ref: string): string => decodeURIComponent(ref.slice(ref.lastIndexOf('/') + 1));

/** A path split at the slashes outside brackets: `a/oneOf[#/components/schemas/B]/c`. */
const splitPath = (path: string): string[] => {
  const segments: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < path.length; index++) {
    const char = path[index];
    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth = Math.max(0, depth - 1);
    } else if (char === '/' && depth === 0) {
      segments.push(path.slice(start, index));
      start = index + 1;
    }
  }
  segments.push(path.slice(start));
  return segments.filter((segment) => segment !== '');
};

const compositionMember = (schema: Json, kind: string, selector: string): unknown => {
  const members: unknown[] = Array.isArray(schema[kind]) ? schema[kind] : [];
  if (selector.startsWith('#/')) {
    return members.find((member) => isRecord(member) && member.$ref === selector);
  }
  const index = /^subschema #(\d+)/.exec(selector);
  return index ? members[Number(index[1]) - 1] : undefined;
};

const findProperty = (document: Json, schema: unknown, name: string, depth = 0): unknown => {
  const resolved = deref(document, schema);
  if (!isRecord(resolved) || depth > MAX_DEPTH) {
    return undefined;
  }
  if (isRecord(resolved.properties) && name in resolved.properties) {
    return resolved.properties[name];
  }
  for (const member of Array.isArray(resolved.allOf) ? resolved.allOf : []) {
    const found = findProperty(document, member, name, depth + 1);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
};

/** Follows `oasdiff`'s path from a schema to the field, or `undefined` when it can't. */
const walk = (document: Json, root: unknown, segments: readonly string[]): unknown => {
  let current: unknown = root;
  for (const segment of segments) {
    const resolved = deref(document, current);
    if (!isRecord(resolved)) {
      return undefined;
    }
    const composition = /^(allOf|oneOf|anyOf)\[([\s\S]*)\]$/.exec(segment);
    if (composition) {
      // `subschema #49: A -> subschema #50: A` goes through a list inside a list: not followed.
      current = composition[2].includes('->')
        ? undefined
        : compositionMember(resolved, composition[1], composition[2]);
    } else if (segment === 'items' && resolved.items !== undefined) {
      current = resolved.items;
    } else if (segment === 'additionalProperties' && isRecord(resolved.additionalProperties)) {
      current = resolved.additionalProperties;
    } else {
      current = findProperty(document, resolved, segment);
    }
    if (current === undefined) {
      return undefined;
    }
  }
  return current;
};

const union = (names: readonly string[]): string => {
  const unique = [...new Set(names)];
  return unique.length > MAX_LISTED_TYPES
    ? [...unique.slice(0, MAX_LISTED_TYPES), '…'].join(' | ')
    : unique.join(' | ');
};

const typeOf = (document: Json, node: unknown, depth = 0): string => {
  if (!isRecord(node)) {
    return 'any';
  }
  if (typeof node.$ref === 'string') {
    return refName(node.$ref);
  }
  if (depth > MAX_TYPE_DEPTH) {
    return 'any';
  }
  const nullable = node.nullable === true ? ' | null' : '';
  const membersOf = (kind: string): string[] =>
    (Array.isArray(node[kind]) ? node[kind] : []).map((member: unknown) =>
      typeOf(document, member, depth + 1)
    );
  for (const kind of ['oneOf', 'anyOf']) {
    const names = membersOf(kind);
    if (names.length > 0) {
      return `${union(names)}${nullable}`;
    }
  }
  const all = membersOf('allOf');
  if (all.length > 0) {
    return `${[...new Set(all)].join(' & ')}${nullable}`;
  }
  if (Array.isArray(node.enum) && node.enum.length > 0) {
    return `${union(node.enum.map(String))}${nullable}`;
  }
  if (Array.isArray(node.type)) {
    return union(node.type.map(String));
  }
  if (node.type === 'array') {
    const items = node.items === undefined ? 'any' : typeOf(document, node.items, depth + 1);
    return `${items.includes(' ') ? `(${items})` : items}[]${nullable}`;
  }
  if (typeof node.type === 'string') {
    return `${node.type}${nullable}`;
  }
  return isRecord(node.properties) ? `object${nullable}` : 'any';
};

const mediaTypeOf = (text: string, content: Json): string | undefined => {
  const named = /\(media type: ([^)]+)\)/.exec(text)?.[1];
  if (named !== undefined && named in content) {
    return named;
  }
  return Object.keys(content).find((type) => type.includes('json')) ?? Object.keys(content)[0];
};

const schemaOfContent = (document: Json, holder: unknown, text: string): unknown => {
  const resolved = deref(document, holder);
  if (!isRecord(resolved) || !isRecord(resolved.content)) {
    return undefined;
  }
  const type = mediaTypeOf(text, resolved.content);
  const media = type === undefined ? undefined : resolved.content[type];
  return isRecord(media) ? media.schema : undefined;
};

const STATUS = /^(\d{3}|[1-5]XX|default)$/;

const responseOf = (responses: unknown, text: string): unknown => {
  if (!isRecord(responses)) {
    return undefined;
  }
  // The status is named after "status" or before it; a value or field of that form may come first.
  const phrase = /status `([^`]+)`|`([^`]+)` status/.exec(text);
  const said = phrase?.[1] ?? phrase?.[2];
  const named =
    said !== undefined && STATUS.test(said)
      ? said
      : quoted(text)
          .filter((name) => STATUS.test(name))
          .pop();
  if (named !== undefined) {
    return responses[named];
  }
  const success = Object.keys(responses)
    .filter((status) => /^2/.test(status))
    .sort()[0];
  return success === undefined ? undefined : responses[success];
};

const VARIANT_RULE = /discriminator-mapping|-(one|any|all)-of-(added|removed)$/;

/** The field the change names: for an enum value or a variant, the field they are of. */
const fieldPathOf = (id: string, names: readonly string[]): string | undefined => {
  if (/-enum-value-(added|removed)$/.test(id) || VARIANT_RULE.test(id)) {
    const field = names[1];
    return field === undefined || ['oneOf', 'anyOf', 'allOf'].includes(field) ? undefined : field;
  }
  return names[0];
};

// The field was dropped from the new spec: its type is the committed one.
const isFieldRemoval = (id: string): boolean =>
  /^(request|response)-(optional-|required-)?property-removed$/.test(id) ||
  id === 'request-parameter-removed';

const lengthened = (type: string): string =>
  type.length > MAX_TYPE_LENGTH ? `${type.slice(0, MAX_TYPE_LENGTH - 1)}…` : type;

const typeIn = ({ id, text, operation }: SpecChange, document: unknown): string | undefined => {
  if (operation === undefined || !isRecord(document) || !isRecord(document.paths)) {
    return undefined;
  }
  const separator = operation.indexOf(' ');
  const pathItem = document.paths[operation.slice(separator + 1)];
  const spec = isRecord(pathItem) ? pathItem[operation.slice(0, separator).toLowerCase()] : null;
  if (!isRecord(spec)) {
    return undefined;
  }
  const names = quoted(text);

  if (/parameter/.test(id)) {
    const at = names.findIndex((name) => /^(query|header|path|cookie)$/.test(name));
    if (at < 0 || names[at + 1] === undefined) {
      return undefined;
    }
    // The operation's own parameters override those of its path.
    const parameters = [
      ...(Array.isArray(spec.parameters) ? spec.parameters : []),
      ...(isRecord(pathItem) && Array.isArray(pathItem.parameters) ? pathItem.parameters : []),
    ].map((parameter) => deref(document, parameter));
    const found = parameters.find(
      (parameter) =>
        isRecord(parameter) && parameter.in === names[at] && parameter.name === names[at + 1]
    );
    return isRecord(found) && found.schema !== undefined
      ? lengthened(typeOf(document, found.schema))
      : undefined;
  }

  const root = id.startsWith('response-')
    ? schemaOfContent(document, responseOf(spec.responses, text), text)
    : id.startsWith('request-') || id.startsWith('new-')
    ? schemaOfContent(document, spec.requestBody, text)
    : undefined;
  if (root === undefined) {
    return undefined;
  }
  const field = fieldPathOf(id, names);
  const node = field === undefined ? root : walk(document, root, splitPath(field));
  if (node === undefined) {
    return undefined;
  }
  // A new enum value or variant is about what the field is made of, so a named schema is shown
  // by its values or variants.
  const shown =
    /-enum-value-(added|removed)$/.test(id) || VARIANT_RULE.test(id) ? deref(document, node) : node;
  return lengthened(typeOf(document, shown));
};

// A field that is new, or gone, has no type on the other side.
const isFieldAddition = (id: string): boolean =>
  /^new-(optional|required)-request-(property|parameter)$/.test(id) ||
  /^response-(optional|required)-property-added$/.test(id);

/**
 * The type of the field a change is about, and what it was before when the field was there before:
 * `type` is read from the refreshed snapshot (the committed one for a field that was removed) and
 * `typeBefore` from the committed one.
 */
export const fieldTypesOf = (
  change: SpecChange,
  { committed, current }: SnapshotDocuments
): { type?: string; typeBefore?: string } => {
  const type = typeIn(change, isFieldRemoval(change.id) ? committed : current);
  const typeBefore =
    isFieldRemoval(change.id) || isFieldAddition(change.id) ? undefined : typeIn(change, committed);
  return {
    ...(type === undefined ? {} : { type }),
    ...(typeBefore === undefined ? {} : { typeBefore }),
  };
};

export const fieldTypeOf = (change: SpecChange, documents: SnapshotDocuments): string | undefined =>
  fieldTypesOf(change, documents).type;
