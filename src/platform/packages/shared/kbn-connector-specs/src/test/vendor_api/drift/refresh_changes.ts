/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The changes `oasdiff` found on one endpoint, as markdown for a cell of the refresh PR. What
 * changed in the response and in the request is shown with a line per field that was added (`+`),
 * removed (`-`) or changed (`!`) and its type:
 *
 *     + fontVariantPosition: NORMAL | SUPER | SUB
 *     ! value: boolean | string | SlotContentId
 *
 * Auth scopes, error responses and removed schemas follow as lists. The fields are named by their
 * path without what only matters to the diff itself: the schema composition a field sits in, the
 * media types it was reported for, a scope list that was only regrouped.
 */

import type { SpecChange } from './detect_drift';
import { requestParameterOf } from './oasdiff_text';

const MAX_NAME_LENGTH = 80;
/** How many names of a list a cell shows to begin with; the refresh PR may show more. */
export const DEFAULT_NAMES_SHOWN = 10;
const MAX_VARIANTS_NAMED = 3;
const COMBINATORS = new Set(['oneOf', 'anyOf', 'allOf']);
const RESPONSE_BODY = '(response body)';
const REQUEST_BODY = '(request body)';

type Sign = '-' | '+' | '!';

const SIGNS: readonly Sign[] = ['-', '+', '!'];
const SIGN_WORDS: Readonly<Record<Sign, string>> = { '-': 'removed', '+': 'added', '!': 'changed' };

// The places a change can be in, in the order they are shown.
const AREAS = [
  'Response',
  'Request',
  'Schemas',
  'Auth scopes',
  'Error responses',
  'Other',
] as const;

type Area = (typeof AREAS)[number];

interface Entry {
  readonly area: Area;
  readonly sign: Sign;
  /** The field, scope or schema the line is about. */
  readonly name: string;
  readonly type?: string;
  /** What the type was before, for a field that changed. */
  readonly typeBefore?: string;
  /** What changed about it, shown in brackets; a field with several changes shows them all. */
  readonly details: readonly string[];
  /** Discriminator keys the field gained or lost: more concrete types it can have. */
  readonly keys?: {
    readonly sign: '+' | '-';
    readonly names: readonly string[];
    readonly base: string;
  };
}

const quoted = (text: string): string[] => [...text.matchAll(/`([^`]+)`/g)].map(([, name]) => name);

const isParameter = (id: string): boolean => /parameter/.test(id);

// How a parameter's location is written, so that it is not mistaken for a part of a body.
const PARAMETER_LOCATION = /^(query|header|path|cookie) parameter$/;

/** What a change is about, and what the text says of it: for a parameter, after its location. */
const subjectOf = ({
  id,
  text,
}: SpecChange): { name?: string; rest: string[]; location?: string } => {
  const names = quoted(text);
  const parameter = isParameter(id) ? requestParameterOf(text) : undefined;
  if (parameter !== undefined) {
    // What the text says after the parameter, such as the bound it set.
    const after = quoted(text.slice(text.indexOf(`request parameter \`${parameter.name}\``)));
    return {
      name: parameter.name,
      rest: after.slice(1),
      location: `${parameter.location} parameter`,
    };
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

const shortName = (name: string): string =>
  name.length > MAX_NAME_LENGTH ? `…${name.slice(-(MAX_NAME_LENGTH - 1))}` : name;

/**
 * The field a path ends in, `document/children/componentProperties/additionalProperties/value` as
 * `value`: the type says what it is, and the path only says where it sits in a schema that is
 * often shared. A map's values keep the name of the map (`labels/additionalProperties`).
 */
const fieldOf = (path: string): string => {
  const tidied = tidy(path);
  // Nothing but composition selectors are left: the root of a shape, named by the schema the last
  // one selects, `allOf[#/…/baseItem]/allOf[subschema #1: entity]` as `entity`.
  const selectors = [...tidied.matchAll(/(?:allOf|oneOf|anyOf)\[([^\]]*)\]/g)];
  const onlySelectors =
    tidied.replace(/(?:allOf|oneOf|anyOf)\[[^\]]*\]/g, '').replace(/\//g, '') === '';
  if (selectors.length > 0 && onlySelectors) {
    const [, selected] = selectors[selectors.length - 1];
    const named = selected.includes(': ')
      ? selected.slice(selected.lastIndexOf(': ') + 2)
      : selected.slice(selected.lastIndexOf('/') + 1);
    return shortName(named.trim());
  }
  const segments = tidied.split('/');
  const last = segments[segments.length - 1];
  const name =
    last === 'additionalProperties' && segments.length > 1
      ? `${segments[segments.length - 2]}/additionalProperties`
      : last;
  return shortName(name);
};

// `https://www.googleapis.com/auth/gmail.labels` as `gmail.labels`, `https://mail.google.com/` as
// `mail.google.com`.
const scopeName = (scope: string): string => {
  const trimmed = scope.replace(/\/+$/, '');
  return trimmed.slice(trimmed.lastIndexOf('/') + 1);
};

/** A scheme an endpoint's security asks for, with one of its scopes when it has any. */
interface Grant {
  readonly scheme: string;
  readonly scope?: string;
}

/** What a security change adds or removes, or undefined for a rule that isn't about that. */
const grantsOf = ({ id, text }: SpecChange): Grant[] | undefined => {
  const names = quoted(text);
  if (id === 'api-security-added' || id === 'api-security-removed') {
    // `Oauth2: [https://…/auth/a, https://…/auth/b]`, or `apiKey` for a scheme without scopes.
    const match = /^([^:[]+?)(?::\s*\[([^\]]*)\])?$/.exec(names[0] ?? '');
    if (match === null) return undefined;
    const scheme = match[1].trim();
    const scopes = (match[2] ?? '')
      .split(',')
      .map((scope) => scopeName(scope.trim()))
      .filter((scope) => scope !== '');
    return scopes.length === 0 ? [{ scheme }] : scopes.map((scope) => ({ scheme, scope }));
  }
  if (id === 'api-security-scope-added' || id === 'api-security-scope-removed') {
    // The security scope `pipeline:write` was added to the endpoint's security scheme `oauth2`.
    const [scope, scheme] = names;
    return scope === undefined || scheme === undefined
      ? undefined
      : [{ scheme, scope: scopeName(scope) }];
  }
  if (/^api-security-component-oauth-scope-(added|removed)$/.test(id)) {
    // The component security scheme `oauth2` oauth `clientCredentials` flow scope `write` was added.
    const scheme = names[0];
    const scope = names[names.length - 1];
    return names.length < 2 ? undefined : [{ scheme, scope: scopeName(scope) }];
  }
  if (id === 'api-security-component-added' || id === 'api-security-component-removed') {
    return names[0] === undefined ? undefined : [{ scheme: names[0] }];
  }
  return undefined;
};

const isGrantChange = (change: SpecChange): boolean => grantsOf(change) !== undefined;

/**
 * The schemes and scopes really added or removed: a set that is only regrouped changes nothing.
 * A scope is named alone while one scheme is involved, and with its scheme when several are.
 */
const scopeEntries = (changes: readonly SpecChange[]): Entry[] => {
  const keyOf = ({ scheme, scope }: Grant) => `${scheme}\u0000${scope ?? ''}`;
  const collect = (suffix: string) =>
    new Map(
      changes
        .filter(({ id }) => id.endsWith(suffix))
        .flatMap((change) => grantsOf(change) ?? [])
        .map((grant) => [keyOf(grant), grant] as const)
    );
  const added = collect('-added');
  const removed = collect('-removed');
  const schemes = new Set([...added.values(), ...removed.values()].map(({ scheme }) => scheme));
  const nameOf = ({ scheme, scope }: Grant): string =>
    scope === undefined ? `${scheme} (scheme)` : schemes.size > 1 ? `${scope} (${scheme})` : scope;
  const only = (sign: '+' | '-', these: Map<string, Grant>, others: Map<string, Grant>): Entry[] =>
    [...these.entries()]
      .filter(([key]) => !others.has(key))
      .map(([, grant]) => ({
        area: 'Auth scopes' as const,
        sign,
        name: nameOf(grant),
        details: [],
      }));
  return [...only('+', added, removed), ...only('-', removed, added)];
};

/** The part of the API a request or response rule is about. */
const areaOf = (id: string): Area | undefined => {
  if (isParameter(id) || id.startsWith('request-') || id.startsWith('new-')) return 'Request';
  if (id.startsWith('response-')) return 'Response';
  return undefined;
};

const camelCase = (kebab: string): string =>
  kebab.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** What changed about a field, in a few words, for the rules that say more than their name. */
const detailOf = (
  id: string,
  rest: readonly string[],
  type: string | undefined
): string | undefined => {
  if (/-type-(changed|specialized|generalized)$/.test(id) && rest.length >= 3) {
    return type === undefined ? `${rest[1]} → ${rest[2]}` : `was ${rest[1]}`;
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

/** `#/components/schemas/SlotContentId` as `SlotContentId`; an inline schema keeps its number. */
const variantName = (variant: string): string =>
  variant
    .trim()
    .replace(/^#\/components\/schemas\//, '')
    .replace(/^#/, '');

const variantNames = (list: string): string[] =>
  list
    .split(',')
    .map(variantName)
    .filter((name) => name !== '');

/** The schema a path ends by selecting, `…/allOf[subschema #2: outlookItem]` as `outlookItem`. */
const baseNameOf = (path: string): string | undefined => {
  const selected = /(?:allOf|oneOf|anyOf)\[([^\]]*)\]$/.exec(path)?.[1];
  if (selected === undefined) {
    return undefined;
  }
  const name = (
    selected.includes(': ')
      ? selected.slice(selected.lastIndexOf(': ') + 2)
      : selected.slice(selected.lastIndexOf('/') + 1)
  ).trim();
  return name === '' || name.startsWith('subschema') ? undefined : name;
};

/** A type and the concrete types it also is, `outlookItem | distributionList`. */
const withSubtypes = (base: string, names: Iterable<string>): string => {
  const sorted = [...new Set(names)].sort(byText);
  const more = sorted.length - MAX_VARIANTS_NAMED;
  return `${[base, ...sorted.slice(0, MAX_VARIANTS_NAMED)].join(' | ')}${
    more > 0 ? ` and ${more} more` : ''
  }`;
};

/** The keys of all the changes of a field, as one change of its type from what it was to what it is. */
const withSubtypeChanges = (entries: readonly Entry[]): Entry[] => {
  const others = entries.filter((entry) => entry.keys === undefined);
  const fields = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (entry.keys !== undefined) {
      const key = `${entry.area}\u0000${entry.name}`;
      fields.set(key, [...(fields.get(key) ?? []), entry]);
    }
  }
  const merged = [...fields.values()].map((group): Entry => {
    const [first] = group;
    const keysOf = (sign: '+' | '-') =>
      group.flatMap(({ keys }) => (keys?.sign === sign ? keys.names : []));
    const base = first.keys?.base ?? 'object';
    return {
      area: first.area,
      sign: '!',
      name: first.name,
      type: withSubtypes(base, keysOf('+')),
      typeBefore: withSubtypes(base, keysOf('-')),
      details: [],
    };
  });
  return [...others, ...merged];
};

const entriesOf = (change: SpecChange): Entry[] | undefined => {
  const { id, text, type } = change;
  const names = quoted(text);
  const area = areaOf(id);

  if (isGrantChange(change)) {
    return []; // Netted out over every security change of the endpoint, in `scopeEntries`.
  }
  if (id === 'response-non-success-status-added' || id === 'response-non-success-status-removed') {
    return names[0] === undefined
      ? undefined
      : [
          {
            area: 'Error responses',
            sign: id.endsWith('-added') ? '+' : '-',
            name: names[0],
            details: [],
          },
        ];
  }
  if (id === 'api-schema-removed') {
    return names[0] === undefined
      ? undefined
      : [{ area: 'Schemas', sign: '-', name: tidy(names[0]), details: [] }];
  }

  // An enum value or a variant is a change of the field it is of, which has its new type.
  const isEnum = /-enum-value-(added|removed)$/.test(id);
  const isVariant = /discriminator-mapping|-(one|any|all)-of-(added|removed)$/.test(id);
  if (isEnum || isVariant) {
    // A parameter is named after its location: the value, then `query`, then the parameter.
    const parameter = isParameter(id) ? subjectOf(change) : undefined;
    const [list] = names;
    const second = parameter === undefined ? names[1] : parameter.name;
    if (list === undefined) return undefined;
    const body = second === undefined || COMBINATORS.has(second);
    const sign = /-added$/.test(id) ? '+' : '-';
    const entryArea = id.startsWith('request-') ? 'Request' : 'Response';
    const fieldName = body
      ? entryArea === 'Request'
        ? REQUEST_BODY
        : RESPONSE_BODY
      : fieldOf(second);
    const location = parameter?.location === undefined ? [] : [parameter.location];
    if (/discriminator-mapping/.test(id)) {
      // The keys of a discriminator aren't a part of the type: they are more concrete types the
      // field can have, and are put with its type once all the changes of the field are known.
      return [
        {
          area: entryArea,
          sign: '!',
          name: fieldName,
          details: location,
          keys: {
            sign,
            names: variantNames(list),
            base: (body ? undefined : baseNameOf(second)) ?? change.typeBefore ?? type ?? 'object',
          },
        },
      ];
    }
    const what = isEnum ? list : variantNames(list).join(', ');
    // A value or variant is in the type, unless it is unknown, cut short or unchanged.
    const visible = type !== undefined && !type.includes('…') && type !== change.typeBefore;
    return [
      {
        area: entryArea,
        sign: '!',
        name: fieldName,
        type,
        typeBefore: change.typeBefore,
        details: visible ? location : [...location, `${sign} ${what}`],
      },
    ];
  }

  const { name, rest, location } = subjectOf(change);
  if (area === undefined || name === undefined) {
    return undefined;
  }
  const entry = (sign: Sign, details: ReadonlyArray<string | undefined>): Entry[] => [
    {
      area,
      sign,
      name: fieldOf(name),
      type,
      typeBefore: change.typeBefore,
      details: [location, ...details].filter((detail): detail is string => detail !== undefined),
    },
  ];
  if (id.endsWith('-deprecated')) {
    return entry('!', ['deprecated']);
  }
  if (
    /^new-(optional|required)-request-(property|parameter)$/.test(id) ||
    /^response-(optional|required)-property-added$/.test(id)
  ) {
    return entry('+', []);
  }
  if (/-(removed|deleted)$/.test(id)) {
    return entry('-', []);
  }
  return entry('!', [detailOf(id, rest, type)]);
};

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

// The location of a parameter comes before what changed about it.
const byLocationFirst = (a: string, b: string): number =>
  Number(PARAMETER_LOCATION.test(b)) - Number(PARAMETER_LOCATION.test(a)) || byText(a, b);

/** Lines of a diff that are always shown whole. */
interface FixedPart {
  readonly kind: 'fixed';
  readonly lines: readonly string[];
  /** How many changes the lines stand for. */
  readonly count: number;
}

/**
 * A list of fields, of which `shown` are written out.
 * Each is the lines of the diff for one field: a line, or for a field that changed its type the
 * line it had and the line it has.
 */
export interface ListPart {
  readonly kind: 'list';
  readonly sign: Sign;
  readonly items: ReadonlyArray<readonly string[]>;
  /** What the fields are, for the line that counts the ones left out. */
  readonly moreLabel: string;
  shown: number;
}

export type ChangePart = FixedPart | ListPart;

/** The changes in one place (response, request, …): a heading and the parts of its diff block. */
export interface ChangeArea {
  readonly heading: string;
  readonly parts: readonly ChangePart[];
}

interface Field {
  readonly name: string;
  readonly type?: string;
  readonly typeBefore?: string;
  readonly details: Set<string>;
}

const LISTED_DETAIL = /^([+-] )(.+)$/;

/**
 * What changed about a field, for the brackets after it: the values and variants that were added or
 * removed, from all the changes of the field, are one list of their names.
 */
const detailsOf = (details: ReadonlySet<string>): string[] => {
  const listed = new Map<string, Set<string>>();
  const plain: string[] = [];
  for (const detail of details) {
    const match = LISTED_DETAIL.exec(detail);
    if (match === null) {
      plain.push(detail);
    } else {
      const names = listed.get(match[1]) ?? new Set<string>();
      match[2].split(', ').forEach((name) => names.add(name));
      listed.set(match[1], names);
    }
  }
  return [
    ...plain,
    ...[...listed].map(([prefix, names]) => {
      const sorted = [...names].sort(byText);
      const more = sorted.length - MAX_VARIANTS_NAMED;
      return `${prefix}${sorted.slice(0, MAX_VARIANTS_NAMED).join(', ')}${
        more > 0 ? ` and ${more} more` : ''
      }`;
    }),
  ].sort(byLocationFirst);
};

/** A field's name and type, then in brackets what changed about it. */
const lineOf = ({ name, type, details }: Field): string => {
  const brackets = detailsOf(details);
  return `${name}${type === undefined ? '' : `: ${type}`}${
    brackets.length > 0 ? ` (${brackets.join(', ')})` : ''
  }`;
};

// What is told by the two lines of a field that changed its type: not said again in brackets.
const isTypeChange = (detail: string): boolean =>
  /^(was |[+-] |now nullable$|no longer nullable$)/.test(detail);

/** The lines of a field: what it was and what it is when its type changed, else one line. */
const linesOf = (sign: Sign, field: Field): string[] => {
  const { name, type, typeBefore } = field;
  if (sign === '!' && type !== undefined && typeBefore !== undefined && type !== typeBefore) {
    const details = new Set([...field.details].filter((detail) => !isTypeChange(detail)));
    return [`- ${name}: ${typeBefore}`, `+ ${lineOf({ name, type, details })}`];
  }
  return [`${sign} ${lineOf(field)}`];
};

const listPart = (area: Area, sign: Sign, entries: readonly Entry[]): ListPart => {
  // A field that several changes are about is one item, with all their details.
  const fields = new Map<string, Field>();
  for (const { name, type, typeBefore, details } of entries) {
    // Fields of the same name and type, wherever they sit, are one item.
    const key = `${name}\u0000${typeBefore ?? ''}\u0000${type ?? ''}`;
    const field: Field = fields.get(key) ?? { name, type, typeBefore, details: new Set<string>() };
    details.forEach((detail) => field.details.add(detail));
    fields.set(key, field);
  }
  const items = [...fields.values()]
    .sort((a, b) => byText(a.name, b.name) || byText(a.type ?? '', b.type ?? ''))
    .map((field) => linesOf(sign, field));
  return {
    kind: 'list',
    sign,
    items,
    moreLabel: SIGN_WORDS[sign],
    shown: Math.min(items.length, DEFAULT_NAMES_SHOWN),
  };
};

/** The lines of a part of a diff block. */
export const partLines = (part: ChangePart): string[] => {
  if (part.kind === 'fixed') {
    return [...part.lines];
  }
  const more = part.items.length - part.shown;
  return [
    ...part.items.slice(0, part.shown).flat(),
    ...(more > 0 ? [`  … and ${more} more ${part.moreLabel}`] : []),
  ];
};

/** The lines of an area: its bold heading, then one diff block with the lines of its parts. */
export const areaLines = ({ heading, parts }: ChangeArea): string[] => [
  heading,
  '```diff',
  ...parts.flatMap(partLines),
  '```',
  '',
];

/** The changes to one endpoint, by area, with what was removed, added and changed in each. */
export const changeAreas = (changes: readonly SpecChange[]): ChangeArea[] => {
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
  const securityChanges = changes.filter(isGrantChange);
  const scopes = scopeEntries(securityChanges);
  entries.splice(0, entries.length, ...withSubtypeChanges(entries), ...scopes);
  const regrouped = securityChanges.length > 0 && scopes.length === 0;
  const fixed = (count: number, ...lines: string[]): FixedPart => ({ kind: 'fixed', count, lines });

  return AREAS.flatMap((area): ChangeArea[] => {
    const heading = `**${area}**`;
    if (area === 'Other') {
      return otherRules.size === 0
        ? []
        : [
            {
              heading,
              parts: [
                fixed(
                  [...otherRules.values()].reduce((total, count) => total + count, 0),
                  ...[...otherRules.entries()].map(
                    ([id, count]) => `! ${id}${count > 1 ? ` ×${count}` : ''}`
                  )
                ),
              ],
            },
          ];
    }
    if (area === 'Auth scopes' && regrouped) {
      return [{ heading, parts: [fixed(0, '! same scopes, reordered')] }];
    }
    const ofArea = entries.filter((entry) => entry.area === area);
    if (ofArea.length === 0) {
      return [];
    }
    return [
      {
        heading,
        parts: SIGNS.flatMap((sign) => {
          const withSign = ofArea.filter((entry) => entry.sign === sign);
          return withSign.length === 0 ? [] : [listPart(area, sign, withSign)];
        }),
      },
    ];
  });
};

/**
 * How many distinct changes an area lists, whatever the names shown: a field is one change, however
 * many media types or paths through a shared schema `oasdiff` reported it for.
 */
export const countChanges = ({ parts }: ChangeArea): number =>
  parts.reduce((total, part) => total + (part.kind === 'list' ? part.items.length : part.count), 0);

/** The markdown describing the changes to one endpoint, with the default number of names. */
export const describeChanges = (changes: readonly SpecChange[]): string[] => {
  const lines = changeAreas(changes).flatMap(areaLines);
  // A blank line ends the last block; the cell around it adds its own.
  return lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
};
