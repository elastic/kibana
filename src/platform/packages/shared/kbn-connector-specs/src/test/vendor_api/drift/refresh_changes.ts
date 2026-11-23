/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The changes `oasdiff` found on one endpoint, as markdown for a cell of the refresh PR: for each
 * place a change is in (response fields, request fields, …), the names that were removed, added
 * or changed, as the lines of a diff block. It names fields and leaves out what only matters to
 * the diff itself: the schema composition a field sits in, the media types it was reported for,
 * a scope list that was only regrouped.
 */

import type { SpecChange } from './detect_drift';

const MAX_NAME_LENGTH = 80;
const MAX_NAMES_PER_SECTION = 3;

type Section = 'removed' | 'added' | 'changed';

const SECTIONS: ReadonlyArray<{ readonly section: Section; readonly sign: string }> = [
  { section: 'removed', sign: '-' },
  { section: 'added', sign: '+' },
  { section: 'changed', sign: '!' },
];

// The places a change can be in, in the order they are shown.
const AREAS = [
  'Response fields',
  'Request fields',
  'Request parameters',
  'Enum values',
  'Schemas',
  'Auth scopes',
  'Error responses',
  'Schema variants',
  'Other',
] as const;

type Area = (typeof AREAS)[number];

interface Entry {
  readonly area: Area;
  readonly section: Section;
  /** The line of the diff, after its sign. */
  readonly line: string;
  /** What changed about it, shown in brackets; a field with several changes shows them all. */
  readonly detail?: string;
}

const quoted = (text: string): string[] => [...text.matchAll(/`([^`]+)`/g)].map(([, name]) => name);

const isParameter = (id: string): boolean => /parameter/.test(id);

/** What a change is about, and what the text says of it: for a parameter, after its location. */
const subjectOf = ({ id, text }: SpecChange): { name?: string; rest: string[] } => {
  const names = quoted(text);
  if (isParameter(id)) {
    const location = names.findIndex((name) => /^(query|header|path|cookie)$/.test(name));
    if (location >= 0) {
      return { name: names[location + 1], rest: names.slice(location + 2) };
    }
  }
  return { name: names[0], rest: names.slice(1) };
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

/** The area a request or response rule is about. */
const areaOf = (id: string): Area | undefined => {
  if (isParameter(id)) return 'Request parameters';
  if (id.startsWith('request-') || id.startsWith('new-')) return 'Request fields';
  if (id.startsWith('response-')) return 'Response fields';
  return undefined;
};

const camelCase = (kebab: string): string =>
  kebab.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** What changed about a field, in a few words, for the rules that say more than their name. */
const detailOf = (id: string, rest: readonly string[]): string | undefined => {
  if (/-type-(changed|specialized|generalized)$/.test(id) && rest.length >= 3) {
    return `${rest[1]} → ${rest[2]}`;
  }
  if (/-default-value-changed$/.test(id) && rest.length >= 2) {
    return `default ${rest[0]} → ${rest[1]}`;
  }
  if (/-const-changed$/.test(id) && rest.length >= 2) {
    return `const ${rest[0]} → ${rest[1]}`;
  }
  if (id.endsWith('-became-required')) return 'now required';
  if (id.endsWith('-became-optional')) return 'now optional';
  if (id.endsWith('-became-not-nullable')) return 'no longer nullable';
  if (id.endsWith('-became-nullable')) return 'now nullable';
  if (id.endsWith('-became-read-only')) return 'now read-only';
  if (id.endsWith('-list-of-types-narrowed') && rest.length >= 1) return `no longer ${rest[0]}`;
  if (id.endsWith('-list-of-types-widened') && rest.length >= 1) return `now also ${rest[0]}`;
  const limit = /-(min|max|min-length|max-length|min-items|max-items)-(set|unset)$/.exec(id);
  if (limit) {
    const [, which, verb] = limit;
    return `${camelCase(which)} ${verb}${verb === 'set' && rest[0] ? ` to ${rest[0]}` : ''}`;
  }
  return undefined;
};

const entriesOf = (change: SpecChange): Entry[] | undefined => {
  const { id, text } = change;
  const { name, rest } = subjectOf(change);
  const path = name === undefined ? undefined : tidy(name);
  const area = areaOf(id);

  if (id.startsWith('api-security')) {
    return []; // Netted out over every security change of the endpoint, in `scopeEntries`.
  }
  if (id === 'response-non-success-status-added') {
    return name === undefined
      ? undefined
      : [{ area: 'Error responses', section: 'added', line: name }];
  }
  if (/-enum-value-(added|removed)$/.test(id)) {
    const [value, property] = quoted(text);
    if (value === undefined) return undefined;
    const field = property === undefined ? '' : ` (${shortName(tidy(property))})`;
    const section = id.endsWith('-added') ? 'added' : 'removed';
    return [{ area: 'Enum values', section, line: `${value}${field}` }];
  }
  if (/discriminator-mapping|-(one|any|all)-of-(added|removed)$/.test(id)) {
    return [{ area: 'Schema variants', section: 'changed', line: withoutMediaType(text) }];
  }
  if (id === 'api-schema-removed') {
    return path === undefined ? undefined : [{ area: 'Schemas', section: 'removed', line: path }];
  }
  if (area === undefined || path === undefined) {
    return undefined;
  }
  if (id.endsWith('-deprecated')) {
    return [{ area, section: 'changed', line: shortName(path), detail: 'deprecated' }];
  }
  if (
    /^new-(optional|required)-request-(property|parameter)$/.test(id) ||
    /^response-(optional|required)-property-added$/.test(id)
  ) {
    return [{ area, section: 'added', line: shortName(path) }];
  }
  if (/-(removed|deleted)$/.test(id)) {
    return [{ area, section: 'removed', line: shortName(path) }];
  }
  return [{ area, section: 'changed', line: shortName(path), detail: detailOf(id, rest) }];
};

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

/** The scopes really added or removed: a set that is only regrouped changes nothing. */
const scopeEntries = (changes: readonly SpecChange[]): Entry[] => {
  const added = new Set(changes.filter(({ id }) => id.endsWith('-added')).flatMap(scopesOf));
  const removed = new Set(changes.filter(({ id }) => id.endsWith('-removed')).flatMap(scopesOf));
  return [
    ...[...added]
      .filter((scope) => !removed.has(scope))
      .map((line) => ({ area: 'Auth scopes' as const, section: 'added' as const, line })),
    ...[...removed]
      .filter((scope) => !added.has(scope))
      .map((line) => ({ area: 'Auth scopes' as const, section: 'removed' as const, line })),
  ];
};

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The diff block of one section: its first names, then how many more there are. */
const diffBlock = (area: Area, section: Section, sign: string, entries: readonly Entry[]) => {
  const details = new Map<string, string[]>();
  for (const { line, detail } of entries) {
    const known = details.get(line) ?? [];
    details.set(line, detail !== undefined && !known.includes(detail) ? [...known, detail] : known);
  }
  const names = [...details.entries()]
    .map(([line, found]) => `${line}${found.length > 0 ? ` (${found.join(', ')})` : ''}`)
    .sort(byText);
  const shown = names.slice(0, MAX_NAMES_PER_SECTION);
  const more = names.length - shown.length;
  return [
    `**${section}**`,
    '```diff',
    ...shown.map((line) => `${sign} ${line}`),
    ...(more > 0
      ? [`  … and ${more} more ${section === 'changed' ? 'changed' : area.toLowerCase()}`]
      : []),
    '```',
    '',
  ];
};

/** The markdown describing the changes to one endpoint: a heading per area, a diff per section. */
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
  const scopes = scopeEntries(securityChanges);
  entries.push(...scopes);
  const regrouped = securityChanges.length > 0 && scopes.length === 0;

  const blocks = AREAS.flatMap((area) => {
    if (area === 'Other') {
      return otherRules.size === 0
        ? []
        : [
            area,
            '',
            '**changed**',
            '```diff',
            ...[...otherRules.entries()].map(
              ([id, count]) => `! ${id}${count > 1 ? ` ×${count}` : ''}`
            ),
            '```',
            '',
          ];
    }
    const ofArea = entries.filter((entry) => entry.area === area);
    if (area === 'Auth scopes' && regrouped) {
      return [area, '', 'regrouped, same scopes', ''];
    }
    if (ofArea.length === 0) {
      return [];
    }
    if (area === 'Schema variants') {
      const count = new Set(ofArea.map(({ line }) => line)).size;
      return [
        area,
        '',
        '**changed**',
        '```diff',
        `! ${count} ${count === 1 ? 'change' : 'changes'}`,
        '```',
        '',
      ];
    }
    return [
      area,
      '',
      ...SECTIONS.flatMap(({ section, sign }) => {
        const inSection = ofArea.filter((entry) => entry.section === section);
        return inSection.length === 0 ? [] : diffBlock(area, section, sign, inSection);
      }),
    ];
  });
  // A blank line closes the cell's content; the table adds its own around it.
  return blocks.slice(0, blocks.length > 0 && blocks[blocks.length - 1] === '' ? -1 : undefined);
};
