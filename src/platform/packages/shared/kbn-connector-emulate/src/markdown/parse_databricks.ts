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
  readJsonBlock,
  readMarkdownPage,
  toBounds,
  toDescription,
} from './read_markdown';
import type {
  FieldConstraints,
  FieldType,
  ParameterLocation,
  ParsedPage,
  ReferenceField,
  ReferenceParameter,
  ReferenceResponse,
} from './types';

// Databricks' API reference (docs.databricks.com/api/llms.txt) has a page per endpoint and per
// object. Endpoint pages state `METHOD /path`, then list parameters, the request body and the
// response as nested bullets: `- \`name\` (type, required|optional[, Deprecated])`, followed by
// the description and `Default:`, `Example:`, `Constraints:` and `Possible values:` lines.

const METHOD_LINE = /^`(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) (\/[^`\s]*)`$/;
const OBJECT_TITLE = /^The (\S+) object$/;
const FIELD_LINE = /^( *)- `([^`]+)` \(([^)]*)\)\s*$/;
const VALUE_LINE = /^\s*- `([^`]*)`\s*$/;
const PARAMETERS_HEADING = /^(path|query|header) parameters$/i;
const RETURNED_OBJECT = /^Returns (?:the|an?) (\S+) object\b/;
const BOUND =
  /^(?:\[\s*(-?[\d.]+)\s*\.\.\s*(-?[\d.]+)\s*\]|(<=|>=|<|>)\s*(-?[\d.]+))(?:\s+(characters|items))?$/;

const toType = (token: string): FieldType => {
  const array = /^array of (.+)$/.exec(token);
  if (array) {
    return { kind: 'array', items: toType(array[1].trim()) };
  }
  switch (token) {
    case 'string':
    case 'boolean':
    case 'object':
      return { kind: token };
    case 'int32':
    case 'int64':
      return { kind: 'integer', format: token };
    case 'double':
    case 'float':
      return { kind: 'number', format: token };
    case 'integer':
    case 'number':
      return { kind: token };
    default:
      return { kind: 'any' };
  }
};

/** Reads ``Constraints: `[ 1 .. 100 ] characters`, `^[\w-]+$` `` and the like. */
const toConstraints = (text: string): FieldConstraints =>
  [...text.matchAll(/`([^`]*)`/g)].reduce<FieldConstraints>((constraints, [, value]) => {
    const bound = BOUND.exec(value.trim());
    if (bound) {
      const [, low, high, operator, limit, unit] = bound;
      const minimum = low ?? (operator?.startsWith('>') ? limit : undefined);
      const maximum = high ?? (operator?.startsWith('<') ? limit : undefined);
      // Lengths and counts are integers, so a strict bound moves by one; other values keep it
      // as an excluded bound.
      const strictMinimum = operator === '>';
      const strictMaximum = operator === '<';
      const step = unit === undefined ? 0 : 1;
      return {
        ...constraints,
        ...toBounds(
          minimum === undefined ? undefined : Number(minimum) + (strictMinimum ? step : 0),
          maximum === undefined ? undefined : Number(maximum) - (strictMaximum ? step : 0),
          unit
        ),
        ...(unit === undefined && strictMinimum ? { exclusiveMinimum: true } : {}),
        ...(unit === undefined && strictMaximum ? { exclusiveMaximum: true } : {}),
      };
    }
    return value.startsWith('^') ? { ...constraints, pattern: value } : constraints;
  }, {});

interface FieldNode {
  readonly indent: number;
  readonly name: string;
  readonly type: FieldType;
  readonly flags: readonly string[];
  readonly description: string[];
  readonly values: string[];
  readonly children: FieldNode[];
  default?: string;
  example?: string;
  constraints?: FieldConstraints;
}

const toField = (node: FieldNode): ReferenceField => ({
  name: node.name,
  type: node.type,
  required: node.flags.includes('required'),
  ...(node.flags.includes('deprecated') ? { deprecated: true } : {}),
  ...(toDescription(node.description) ? { description: toDescription(node.description) } : {}),
  ...(node.values.length > 0 ? { enum: node.values } : {}),
  ...(node.default === undefined ? {} : { default: node.default }),
  ...(node.example === undefined ? {} : { example: node.example }),
  ...(node.constraints ? { constraints: node.constraints } : {}),
  ...(node.children.length > 0 ? { children: node.children.map(toField) } : {}),
});

/** Reads a nested bullet list of fields; indentation nests them. */
export const readFieldList = (lines: readonly string[]): ReferenceField[] => {
  const roots: FieldNode[] = [];
  const stack: FieldNode[] = [];
  let listingValues = false;
  for (const line of lines) {
    const field = FIELD_LINE.exec(line);
    if (field) {
      const [, spaces, name, typeText] = field;
      const [typeToken = '', ...flags] = typeText.split(',').map((part) => part.trim());
      const node: FieldNode = {
        indent: spaces.length,
        name,
        type: toType(typeToken),
        flags: flags.map((flag) => flag.toLowerCase()),
        description: [],
        values: [],
        children: [],
      };
      while (stack.length > 0 && stack[stack.length - 1].indent >= node.indent) {
        stack.pop();
      }
      (stack.length > 0 ? stack[stack.length - 1].children : roots).push(node);
      stack.push(node);
      listingValues = false;
      continue;
    }
    const current = stack[stack.length - 1];
    if (!current) {
      continue;
    }
    const value = listingValues ? VALUE_LINE.exec(line) : null;
    const text = line.trim();
    if (value) {
      current.values.push(value[1]);
    } else if (text === 'Possible values:') {
      listingValues = true;
    } else if (/^Default: `.*`$/.test(text)) {
      current.default = text.slice('Default: `'.length, -1);
    } else if (/^Example: `.*`$/.test(text)) {
      current.example ??= text.slice('Example: `'.length, -1);
    } else if (text.startsWith('Constraints:')) {
      current.constraints = { ...current.constraints, ...toConstraints(text) };
    } else {
      listingValues = false;
      current.description.push(text);
    }
  }
  return roots.map(toField);
};

const dirname = (path: string): string => path.replace(/\/[^/]*$/, '');

/**
 * Reads one page of Databricks' Markdown API reference: an endpoint, an object (`The Alert
 * object`), or nothing for index and overview pages. Objects are scoped to their API group
 * (e.g. `alerts/v1`), as versions of a group describe objects with the same name.
 */
export const parseDatabricksPage = (url: string, markdown: string): ParsedPage => {
  const page = readMarkdownPage(markdown);
  // `/api/alerts/v1/get-alert.md` becomes `alerts/v1/get-alert`.
  const pagePath = new URL(url).pathname.replace(/^\/api\//, '').replace(/\.md$/, '');
  const object = OBJECT_TITLE.exec(page.title);
  if (object) {
    return {
      object: {
        scope: dirname(dirname(pagePath)),
        name: object[1],
        fields: readFieldList(findSection(page, 'Attributes')?.lines ?? []),
        example: readJsonBlock(findSection(page, 'Example')?.lines ?? []),
      },
    };
  }

  const methodIndex = page.intro.findIndex((line) => METHOD_LINE.test(line.trim()));
  if (methodIndex === -1) {
    return undefined;
  }
  const [, method, path] = METHOD_LINE.exec(page.intro[methodIndex].trim()) ?? [];
  const launchStage = page.intro.find((line) => line.startsWith('Launch stage:')) ?? '';
  const description = toDescription(
    page.intro
      .slice(methodIndex + 1)
      .filter((line) => !line.startsWith('API scopes:') && !line.startsWith('Launch stage:'))
  );

  const parameters: ReferenceParameter[] = page.sections.flatMap((section) => {
    const location = PARAMETERS_HEADING.exec(section.heading)?.[1].toLowerCase();
    return location
      ? readFieldList(section.lines).map((field) => ({
          ...field,
          in: location as ParameterLocation,
        }))
      : [];
  });
  const bodyFields = readFieldList(findSection(page, 'Request body')?.lines ?? []);

  const returns = findSection(page, 'Returns')?.lines ?? [];
  const returnedFields = readFieldList(returns);
  const returnedObject = returns
    .map((line) => RETURNED_OBJECT.exec(line.trim())?.[1])
    .find((name) => name !== undefined);
  const example = readJsonBlock(findSection(page, 'Response')?.lines ?? []);
  const response: ReferenceResponse = {
    status: '200',
    ...(returnedFields.length > 0 ? { fields: returnedFields } : {}),
    ...(returnedFields.length === 0 && returnedObject
      ? { object: { scope: dirname(pagePath), name: returnedObject } }
      : {}),
    ...(example === undefined ? {} : { example }),
  };

  return {
    endpoint: {
      id: pagePath,
      method: method.toLowerCase(),
      path,
      summary: page.title,
      ...(description ? { description } : {}),
      ...(/deprecated/i.test(launchStage) ? { deprecated: true } : {}),
      parameters,
      ...(bodyFields.length > 0
        ? {
            requestBody: {
              required: bodyFields.some(({ required }) => required),
              mediaType: 'application/json',
              fields: bodyFields,
            },
          }
        : {}),
      responses: [response],
      // Personal access tokens and OAuth tokens are both sent as bearer tokens.
      security: [{ type: 'http', scheme: 'bearer' }],
    },
  };
};
