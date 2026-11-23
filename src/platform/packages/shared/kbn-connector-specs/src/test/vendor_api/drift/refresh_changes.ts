/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The changes `oasdiff` found on one endpoint, in words: what was deprecated, removed or added,
 * which enum values and scopes changed. The refresh PR shows this per endpoint, so it names
 * fields and leaves out what only matters to the diff itself (the schema composition a field sits
 * in, the media types it was reported for, a scope list that was only regrouped).
 */

import type { SpecChange } from './detect_drift';
import { code, listed, plural } from './issue/issue_markdown';

const MAX_NAME_LENGTH = 60;

type Kind =
  | 'deprecated'
  | 'removed'
  | 'enumRemoved'
  | 'enumAdded'
  | 'newRequest'
  | 'newResponse'
  | 'constraints'
  | 'variants'
  | 'scopes'
  | 'errors';

// In the order they are shown: what a reader acts on first.
const KINDS: ReadonlyArray<{ readonly kind: Kind; readonly label: string }> = [
  { kind: 'deprecated', label: 'Deprecated' },
  { kind: 'removed', label: 'Removed' },
  { kind: 'enumRemoved', label: 'Removed enum values' },
  { kind: 'enumAdded', label: 'New enum values' },
  { kind: 'newRequest', label: 'New request fields' },
  { kind: 'newResponse', label: 'New response fields' },
  { kind: 'constraints', label: 'Type or constraint changes' },
  { kind: 'variants', label: 'Schema variants changed' },
  { kind: 'scopes', label: 'Auth scopes' },
  { kind: 'errors', label: 'New error responses' },
];

const kindOf = (id: string): Kind | undefined => {
  if (id.endsWith('-deprecated')) return 'deprecated';
  if (id.startsWith('api-security')) return 'scopes';
  if (id === 'response-non-success-status-added') return 'errors';
  if (id.endsWith('-enum-value-removed')) return 'enumRemoved';
  if (id.endsWith('-enum-value-added')) return 'enumAdded';
  if (/discriminator-mapping|-(one|any|all)-of-(added|removed)$/.test(id)) return 'variants';
  if (/^new-(optional|required)-request-(property|parameter)$/.test(id)) return 'newRequest';
  if (/^response-(optional|required)-property-added$/.test(id)) return 'newResponse';
  if (/-(removed|deleted)$/.test(id)) return 'removed';
  if (/^(request|response)-/.test(id)) return 'constraints';
  return undefined;
};

const quoted = (text: string): string[] => [...text.matchAll(/`([^`]+)`/g)].map(([, name]) => name);

// A change to a parameter names the parameter last (after its location, `query`).
const targetOf = ({ id, text }: SpecChange): string | undefined => {
  const names = quoted(text);
  return /parameter/.test(id) ? names[names.length - 1] : names[0];
};

/** `clusters/items/allOf[#/components/schemas/Cluster]/status` as `clusters/status`. */
const tidy = (path: string): string => {
  const shorter = path
    .replace(/(^|\/)(allOf|oneOf|anyOf)\[[^\]]*\]/g, '$1')
    .replace(/(^|\/)items(?=\/|$)/g, '$1')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/|\/$/g, '');
  return shorter === '' ? path : shorter;
};

// A long path is cut at its start: its end is the field.
const shortName = (name: string): string =>
  code(name.length > MAX_NAME_LENGTH ? `…${name.slice(-(MAX_NAME_LENGTH - 1))}` : name);

const unique = (items: readonly string[]): string[] => [...new Set(items)];

const withoutMediaType = (text: string): string => text.replace(/\s*\(media type:[^)]*\)\s*$/, '');

const scopeName = (scope: string): string => scope.slice(scope.lastIndexOf('/') + 1);

/** The scopes a security change adds (`added: true`) or removes, as names. */
const scopesOf = ({ id, text }: SpecChange): string[] => {
  const names = quoted(text);
  // `Oauth2: [https://…/auth/a, https://…/auth/b]`: a set of scopes one scheme asks for.
  const list = /^[^[]*\[([^\]]*)\]/.exec(names[0] ?? '');
  if (id === 'api-security-added' || id === 'api-security-removed') {
    return (list?.[1] ?? '')
      .split(',')
      .map((scope) => scopeName(scope.trim()))
      .filter((scope) => scope !== '');
  }
  const scope = id.startsWith('api-security-component') ? names[names.length - 1] : names[0];
  return scope === undefined ? [] : [scopeName(scope)];
};

const describeScopes = (changes: readonly SpecChange[]): string => {
  const added = new Set(changes.filter(({ id }) => id.endsWith('-added')).flatMap(scopesOf));
  const removed = new Set(changes.filter(({ id }) => id.endsWith('-removed')).flatMap(scopesOf));
  const onlyAdded = [...added].filter((scope) => !removed.has(scope));
  const onlyRemoved = [...removed].filter((scope) => !added.has(scope));
  if (onlyAdded.length === 0 && onlyRemoved.length === 0) {
    return 'regrouped, same scopes';
  }
  return [
    ...(onlyAdded.length > 0 ? [`added ${listed(onlyAdded.map(shortName))}`] : []),
    ...(onlyRemoved.length > 0 ? [`removed ${listed(onlyRemoved.map(shortName))}`] : []),
  ].join('; ');
};

const describeKind = (kind: Kind, changes: readonly SpecChange[]): string | undefined => {
  if (kind === 'scopes') {
    return describeScopes(changes);
  }
  if (kind === 'variants') {
    return plural(unique(changes.map(({ text }) => withoutMediaType(text))).length, 'change');
  }
  if (kind === 'enumAdded' || kind === 'enumRemoved') {
    const valuesOf = new Map<string, string[]>();
    for (const { text } of changes) {
      const [value, property] = quoted(text);
      if (value !== undefined) {
        const key = property === undefined ? '' : tidy(property);
        valuesOf.set(key, unique([...(valuesOf.get(key) ?? []), value]));
      }
    }
    const groups = [...valuesOf.entries()].map(
      ([property, values]) =>
        `${values.map(shortName).join(', ')}${property === '' ? '' : ` on ${shortName(property)}`}`
    );
    return groups.length > 0 ? listed(groups) : undefined;
  }
  const targets = unique(
    changes.flatMap((change) => {
      const target = targetOf(change);
      return target === undefined ? [] : [tidy(target)];
    })
  );
  return targets.length > 0 ? listed(targets.map(shortName)) : undefined;
};

/** One line per kind of change, then one for every rule that fits no kind. */
export const describeChanges = (changes: readonly SpecChange[]): string[] => {
  const byKind = new Map<Kind, SpecChange[]>();
  const otherRules = new Map<string, number>();
  for (const change of changes) {
    const kind = kindOf(change.id);
    if (kind === undefined) {
      otherRules.set(change.id, (otherRules.get(change.id) ?? 0) + 1);
    } else {
      byKind.set(kind, [...(byKind.get(kind) ?? []), change]);
    }
  }
  const lines = KINDS.flatMap(({ kind, label }) => {
    const group = byKind.get(kind);
    if (group === undefined) {
      return [];
    }
    const described = describeKind(kind, group);
    return [`**${label}:** ${described ?? plural(group.length, 'change')}`];
  });
  const others = [...otherRules.entries()].map(
    ([id, count]) => `${code(id)}${count > 1 ? ` ×${count}` : ''}`
  );
  return [...lines, ...(others.length > 0 ? [`**Other:** ${others.join(', ')}`] : [])];
};
