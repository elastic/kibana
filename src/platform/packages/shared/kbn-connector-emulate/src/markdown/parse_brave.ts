/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  findSection,
  readMarkdownPage,
  readTable,
  toBounds,
  toDescription,
  unquote,
} from './read_markdown';
import type {
  FieldType,
  ParsedPage,
  ReferenceField,
  ReferenceParameter,
  ReferenceResponse,
  ReferenceSecurity,
} from './types';

// Brave Search's API reference (api-dashboard.search.brave.com/llms.txt) has a page per
// endpoint: `METHOD` `/path` and a base URL, then tables of parameters (Name, Location, Type,
// Required, Constraints, Description) and flat tables of body and response fields whose names
// encode nesting (`results[].thumbnail.src`). A type ending in `?` is optional.

const METHOD_LINE = /^`(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)` `(\/[^`\s]*)`$/;
const BASE_URL = /^\*\*Base URL:\*\* `([^`]+)`$/;
const RANGE = /^`(-?[\d.]+)`-`(-?[\d.]+)`$/;
const VALUES = /^`[^`]*`(?:,\s*`[^`]*`)*$/;

const toBaseType = (token: string): FieldType => {
  switch (token) {
    case 'string':
    case 'object':
    case 'number':
    case 'any':
      return { kind: token };
    case 'bool':
    case 'boolean':
      return { kind: 'boolean' };
    case 'int':
    case 'integer':
      return { kind: 'integer' };
    case 'float':
      return { kind: 'number' };
    case 'array':
      return { kind: 'array', items: { kind: 'any' } };
    default:
      return { kind: 'any' };
  }
};

/** Reads `string`, `object[]?` or `string[][]?`; `?` makes the field optional and nullable. */
const toType = (text: string): { type: FieldType; optional: boolean } => {
  const optional = text.endsWith('?');
  const [, base = '', brackets = ''] = /^([^[?]*)((?:\[\])*)\??$/.exec(text.trim()) ?? [];
  let type = toBaseType(base.trim());
  for (let depth = 0; depth < brackets.length / 2; depth++) {
    type = { kind: 'array', items: type };
  }
  return { type, optional };
};

/** Reads constraints such as `` `a`, `b`; default `a` `` or `` `1`-`20`; default `20` ``. */
const toConstraints = (text: string): Pick<ReferenceField, 'enum' | 'default' | 'constraints'> =>
  text
    .split(/;\s*/)
    .map((part) => part.trim())
    .reduce<Pick<ReferenceField, 'enum' | 'default' | 'constraints'>>((result, part) => {
      const fallback = /^default `(.*)`$/.exec(part);
      if (fallback) {
        return { ...result, default: fallback[1] };
      }
      const range = RANGE.exec(part);
      if (range) {
        return { ...result, constraints: toBounds(Number(range[1]), Number(range[2])) };
      }
      return VALUES.test(part)
        ? { ...result, enum: [...part.matchAll(/`([^`]*)`/g)].map(([, value]) => value) }
        : result;
    }, {});

interface FieldNode {
  readonly field: Omit<ReferenceField, 'children'>;
  readonly children: FieldNode[];
}

const toField = ({ field, children }: FieldNode): ReferenceField =>
  children.length > 0 ? { ...field, children: children.map(toField) } : field;

/** Nests a flat table of fields by their dotted names; `[]` marks the items of an array. */
const readFieldTable = (lines: readonly string[]): ReferenceField[] => {
  const roots: FieldNode[] = [];
  const nodes = new Map<string, FieldNode>();
  const childrenOf = (key: string): FieldNode[] => {
    if (key === '') {
      return roots;
    }
    const existing = nodes.get(key);
    if (existing) {
      return existing.children;
    }
    // A parent the table doesn't list, which is an optional object.
    const separator = key.lastIndexOf('.');
    const implicit: FieldNode = {
      field: { name: key.slice(separator + 1), type: { kind: 'object' }, required: false },
      children: [],
    };
    childrenOf(separator === -1 ? '' : key.slice(0, separator).replace(/(\[\])+$/, '')).push(
      implicit
    );
    nodes.set(key, implicit);
    return implicit.children;
  };

  for (const row of readTable(lines)) {
    const name = unquote(row.Field ?? '');
    if (!name) {
      continue;
    }
    const { type, optional } = toType(row.Type ?? '');
    const separator = name.lastIndexOf('.');
    const node: FieldNode = {
      field: {
        name: name.slice(separator + 1),
        type,
        required: !optional,
        ...(optional ? { nullable: true } : {}),
        ...(row.Description ? { description: row.Description } : {}),
        ...toConstraints(row.Constraints ?? ''),
      },
      children: [],
    };
    childrenOf(separator === -1 ? '' : name.slice(0, separator).replace(/(\[\])+$/, '')).push(node);
    nodes.set(name, node);
  }
  return roots.map(toField);
};

const readParameters = (lines: readonly string[]): ReferenceParameter[] =>
  readTable(lines).flatMap((row) => {
    const location = row.Location?.toLowerCase();
    if (location !== 'path' && location !== 'query' && location !== 'header') {
      return [];
    }
    const { type } = toType(row.Type ?? '');
    return [
      {
        name: unquote(row.Name ?? ''),
        in: location,
        type,
        required: row.Required?.toLowerCase() === 'yes',
        ...(row.Description ? { description: row.Description } : {}),
        ...toConstraints(row.Constraints ?? ''),
      },
    ];
  });

const readSecurity = (lines: readonly string[]): ReferenceSecurity[] =>
  readTable(lines).flatMap((row) => {
    const location = row.Location?.toLowerCase();
    return location === 'header' || location === 'query'
      ? [{ type: 'apiKey' as const, in: location, name: unquote(row.Name ?? '') }]
      : [];
  });

/** Reads one page of Brave Search's Markdown API reference: an endpoint, or nothing. */
export const parseBravePage = (url: string, markdown: string): ParsedPage => {
  const page = readMarkdownPage(markdown);
  const intro = page.intro.map((line) => line.trim());
  const methodIndex = intro.findIndex((line) => METHOD_LINE.test(line));
  if (methodIndex === -1) {
    return undefined;
  }
  const [, method, path] = METHOD_LINE.exec(intro[methodIndex]) ?? [];
  const serverUrl = intro.map((line) => BASE_URL.exec(line)?.[1]).find(Boolean);
  const description = toDescription(
    intro.slice(methodIndex + 1).filter((line) => !BASE_URL.test(line))
  );

  const authorization = findSection(page, 'Authorization');
  const body = findSection(page, 'Request Body');
  const parameters = page.sections
    .filter((section) => section !== authorization && section !== body)
    .flatMap((section) => readParameters(section.lines));
  const bodyFields = body ? readFieldTable(body.lines) : [];
  const responses: ReferenceResponse[] = (findSection(page, 'Responses')?.subsections ?? [])
    .filter(({ heading }) => /^\d{3}$/.test(heading))
    .map(({ heading, lines }) => {
      const fields = readFieldTable(lines);
      const summary = lines
        .map((line) => line.trim())
        .find((line) => line && !line.startsWith('|'));
      return {
        status: heading,
        ...(summary ? { description: summary } : {}),
        ...(fields.length > 0 ? { fields } : {}),
      };
    });

  return {
    endpoint: {
      method: method.toLowerCase(),
      path,
      ...(serverUrl ? { serverUrl } : {}),
      summary: page.title,
      ...(description ? { description } : {}),
      parameters,
      ...(body
        ? {
            requestBody: {
              required: body.lines.some((line) => line.trim() === '**Required**'),
              mediaType: 'application/json',
              fields: bodyFields,
            },
          }
        : {}),
      responses,
      security: authorization ? readSecurity(authorization.lines) : [],
    },
  };
};
