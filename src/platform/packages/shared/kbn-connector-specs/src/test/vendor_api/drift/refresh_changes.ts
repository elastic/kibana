/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The changes `oasdiff` found on one endpoint, as the lines of a diff: `+` for what was added,
 * `-` for what was removed and `!` for what changed or was deprecated. The refresh PR shows this
 * per endpoint, so it names fields and leaves out what only matters to the diff itself (the
 * schema composition a field sits in, the media types it was reported for, a scope list that was
 * only regrouped).
 */

import type { SpecChange } from './detect_drift';

const MAX_NAME_LENGTH = 80;
const MAX_NAMES_PER_GROUP = 3;
const VARIANTS_LABEL = 'schema variants changed';

type Sign = '+' | '-' | '!' | ' ';

interface Entry {
  /** Where the group sits among the others: what a reader acts on first comes first. */
  readonly order: number;
  readonly sign: Sign;
  readonly label: string;
  /** Empty for a group that is one line without a name. */
  readonly name: string;
}

const quoted = (text: string): string[] => [...text.matchAll(/`([^`]+)`/g)].map(([, name]) => name);

const isParameter = (id: string): boolean => /parameter/.test(id);

// A change to a parameter names the parameter last (after its location, `query`).
const targetOf = ({ id, text }: SpecChange): string | undefined => {
  const names = quoted(text);
  return isParameter(id) ? names[names.length - 1] : names[0];
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
  name.length > MAX_NAME_LENGTH ? `…${name.slice(-(MAX_NAME_LENGTH - 1))}` : name;

const withoutMediaType = (text: string): string => text.replace(/\s*\(media type:[^)]*\)\s*$/, '');

const scopeName = (scope: string): string => scope.slice(scope.lastIndexOf('/') + 1);

/** The scopes a security change adds or removes, as names. */
const scopesOf = ({ id, text }: SpecChange): string[] => {
  const names = quoted(text);
  if (id === 'api-security-added' || id === 'api-security-removed') {
    // `Oauth2: [https://…/auth/a, https://…/auth/b]`: a set of scopes one scheme asks for.
    const list = /^[^[]*\[([^\]]*)\]/.exec(names[0] ?? '');
    return (list?.[1] ?? '')
      .split(',')
      .map((scope) => scopeName(scope.trim()))
      .filter((scope) => scope !== '');
  }
  const scope = id.startsWith('api-security-component') ? names[names.length - 1] : names[0];
  return scope === undefined ? [] : [scopeName(scope)];
};

const scopeEntries = (changes: readonly SpecChange[]): Entry[] => {
  const added = new Set(changes.filter(({ id }) => id.endsWith('-added')).flatMap(scopesOf));
  const removed = new Set(changes.filter(({ id }) => id.endsWith('-removed')).flatMap(scopesOf));
  const onlyAdded = [...added].filter((scope) => !removed.has(scope));
  const onlyRemoved = [...removed].filter((scope) => !added.has(scope));
  if (onlyAdded.length === 0 && onlyRemoved.length === 0) {
    return [{ order: 8, sign: ' ', label: 'auth scopes regrouped, same scopes', name: '' }];
  }
  return [
    ...onlyAdded.map((name) => ({ order: 8, sign: '+' as const, label: 'auth scope', name })),
    ...onlyRemoved.map((name) => ({ order: 8, sign: '-' as const, label: 'auth scope', name })),
  ];
};

// What was removed: the wording says whether it was in the request or the response.
const removedLabel = (id: string): string => {
  if (isParameter(id)) return 'request parameter';
  if (id.startsWith('request-')) return 'request field';
  if (id.startsWith('response-')) return 'response field';
  if (id === 'api-schema-removed') return 'schema';
  return 'item';
};

const entriesOf = (change: SpecChange): Entry[] | undefined => {
  const { id, text } = change;
  const target = targetOf(change);
  const name = target === undefined ? '' : tidy(target);
  const [value, property] = quoted(text);
  // The value stays whole; it is the field it is on that gets cut when long.
  const enumName =
    value === undefined ? '' : `${value}${property ? ` on ${shortName(tidy(property))}` : ''}`;

  if (id.endsWith('-deprecated')) {
    return [{ order: 0, sign: '!', label: 'deprecated', name }];
  }
  if (id.startsWith('api-security')) {
    return []; // Netted out over every security change of the endpoint, in `scopeEntries`.
  }
  if (id === 'response-non-success-status-added') {
    return [{ order: 9, sign: '+', label: 'error response', name: target ?? '' }];
  }
  if (id.endsWith('-enum-value-removed')) {
    return [{ order: 2, sign: '-', label: 'enum value', name: enumName }];
  }
  if (id.endsWith('-enum-value-added')) {
    return [{ order: 3, sign: '+', label: 'enum value', name: enumName }];
  }
  if (/discriminator-mapping|-(one|any|all)-of-(added|removed)$/.test(id)) {
    return [{ order: 7, sign: '!', label: VARIANTS_LABEL, name: withoutMediaType(text) }];
  }
  if (/^new-(optional|required)-request-(property|parameter)$/.test(id)) {
    const label = isParameter(id) ? 'request parameter' : 'request field';
    return [{ order: 4, sign: '+', label, name }];
  }
  if (/^response-(optional|required)-property-added$/.test(id)) {
    return [{ order: 5, sign: '+', label: 'response field', name }];
  }
  if (/-(removed|deleted)$/.test(id)) {
    return [{ order: 1, sign: '-', label: removedLabel(id), name }];
  }
  if (/^(request|response)-/.test(id)) {
    return [{ order: 6, sign: '!', label: 'changed', name }];
  }
  return undefined;
};

const MORE_LABELS: Readonly<Record<string, string>> = {
  deprecated: 'deprecated',
  changed: 'changed',
};

/** The diff lines of one group: its first names, then how many more there are. */
const linesOf = (entries: readonly Entry[]): string[] => {
  const { sign, label } = entries[0];
  const names = [...new Set(entries.map(({ name }) => name))];
  if (label === VARIANTS_LABEL) {
    return [`${sign} ${label} (${names.length})`];
  }
  if (names.length === 1 && names[0] === '') {
    return [`${sign} ${label}`];
  }
  const shown = names.slice(0, MAX_NAMES_PER_GROUP);
  const more = names.length - shown.length;
  return [
    ...shown.map((name) => `${sign} ${label} ${label === 'enum value' ? name : shortName(name)}`),
    ...(more > 0 ? [`  … and ${more} more ${MORE_LABELS[label] ?? `${label}s`}`] : []),
  ];
};

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The lines of a diff describing the changes to one endpoint, most important first. */
export const describeChanges = (changes: readonly SpecChange[]): string[] => {
  const entries: Entry[] = [];
  const otherRules = new Map<string, number>();
  for (const change of changes) {
    const found = entriesOf(change);
    if (found === undefined) {
      otherRules.set(change.id, (otherRules.get(change.id) ?? 0) + 1);
    } else {
      entries.push(...found);
    }
  }
  const securityChanges = changes.filter(({ id }) => id.startsWith('api-security'));
  if (securityChanges.length > 0) {
    entries.push(...scopeEntries(securityChanges));
  }

  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = `${entry.order}|${entry.sign}|${entry.label}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  const ordered = [...groups.values()].sort(
    (a, b) =>
      a[0].order - b[0].order || byText(a[0].sign, b[0].sign) || byText(a[0].label, b[0].label)
  );
  return [
    ...ordered.flatMap(linesOf),
    ...[...otherRules.entries()].map(([id, count]) => `! ${id}${count > 1 ? ` ×${count}` : ''}`),
  ];
};
