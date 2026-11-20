/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnyNode, Cheerio, CheerioAPI } from 'cheerio';
import { load } from 'cheerio';
import type { JsonSchema, OpenApiDocument } from '../openapi/types';

interface AglioFormat {
  readonly title: string;
  readonly servers: readonly {
    readonly url: string;
    readonly variables?: Readonly<Record<string, { readonly default: string }>>;
  }[];
}

// One entry per vendor that publishes its API as an Aglio page (https://github.com/danielgtaylor/aglio),
// the static HTML that API Blueprint renders to; the conversion is shared.
const FORMATS = {
  'threatq-html': {
    title: 'ThreatQ REST API',
    // Every customer runs their own instance.
    servers: [
      {
        url: 'https://{hostname}/api',
        variables: { hostname: { default: 'threatq.example.com' } },
      },
    ],
  },
} satisfies Readonly<Record<string, AglioFormat>>;

export type AglioReferenceFormat = keyof typeof FORMATS;

export const AGLIO_REFERENCE_FORMATS = Object.keys(FORMATS) as AglioReferenceFormat[];

export const isAglioReferenceFormat = (format: string): format is AglioReferenceFormat =>
  Object.hasOwn(FORMATS, format);

export interface AglioReferenceOptions {
  readonly format: AglioReferenceFormat;
  /** The reference page, as the vendor serves it. */
  readonly html: string;
  /** `info.version`; the page itself states none. */
  readonly version?: string;
}

const METHODS = new Set(['get', 'put', 'post', 'delete', 'patch', 'head', 'options']);

// The URI template's trailing query expression, such as `{?limit,offset}`.
const QUERY_TEMPLATE = /\{\?([^}]*)\}$/;
const PATH_PARAMETER = /\{([^}?]+)\}/g;

const textOf = (element: Cheerio<AnyNode>): string =>
  element.text().replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// What a `null` example implies: nothing about its type, only that it can be absent.
const NULL_SCHEMA: JsonSchema = { nullable: true };

const isNullSchema = (schema: JsonSchema): boolean =>
  schema.type === undefined && schema.nullable === true && Object.keys(schema).length === 1;

const mergeSchemas = (a: JsonSchema, b: JsonSchema): JsonSchema => {
  if (isNullSchema(a)) {
    return isNullSchema(b) ? a : { ...b, nullable: true };
  }
  if (isNullSchema(b)) {
    return { ...a, nullable: true };
  }
  const nullable = a.nullable === true || b.nullable === true ? { nullable: true } : {};
  if (a.type === 'object' && b.type === 'object') {
    const left = (a.properties ?? {}) as Record<string, JsonSchema>;
    const right = (b.properties ?? {}) as Record<string, JsonSchema>;
    const properties: Record<string, JsonSchema> = { ...left };
    for (const [name, schema] of Object.entries(right)) {
      properties[name] = Object.hasOwn(left, name) ? mergeSchemas(left[name], schema) : schema;
    }
    return { type: 'object', properties, ...nullable };
  }
  if (a.type === 'array' && b.type === 'array') {
    // An array without `items` is an empty one, which says nothing about what the items are.
    const items =
      a.items === undefined
        ? b.items
        : b.items === undefined
        ? a.items
        : mergeSchemas(a.items as JsonSchema, b.items as JsonSchema);
    return { type: 'array', ...(items === undefined ? {} : { items }), ...nullable };
  }
  if (a.type !== undefined && a.type === b.type) {
    return { ...a, ...nullable };
  }
  if (
    (a.type === 'integer' || a.type === 'number') &&
    (b.type === 'integer' || b.type === 'number')
  ) {
    return { type: 'number', ...nullable };
  }
  return {};
};

/**
 * What an example value shows of its schema. A `null` says only that the value can be absent, and
 * an empty array, left without `items`, nothing of what it holds, so neither limits what else can
 * be there when examples are merged.
 */
const observeSchema = (value: unknown): JsonSchema => {
  if (Array.isArray(value)) {
    const [first, ...rest] = value.map(observeSchema);
    return { type: 'array', ...(first ? { items: rest.reduce(mergeSchemas, first) } : {}) };
  }
  if (isRecord(value)) {
    return {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(value).map(([name, property]) => [name, observeSchema(property)])
      ),
    };
  }
  switch (typeof value) {
    case 'string':
      return { type: 'string' };
    case 'boolean':
      return { type: 'boolean' };
    case 'number':
      return { type: Number.isInteger(value) ? 'integer' : 'number' };
    default:
      return value === null ? NULL_SCHEMA : {};
  }
};

// OpenAPI 3.0 wants `items` on every array, so one that no example filled gets any item.
const withItems = (schema: JsonSchema): JsonSchema => {
  if (schema.type === 'array') {
    return { ...schema, items: isRecord(schema.items) ? withItems(schema.items) : {} };
  }
  if (schema.type === 'object' && isRecord(schema.properties)) {
    return {
      ...schema,
      properties: Object.fromEntries(
        Object.entries(schema.properties).map(([name, property]) => [
          name,
          withItems(property as JsonSchema),
        ])
      ),
    };
  }
  return schema;
};

/**
 * The schema an example body implies: its types and properties, none of them required, as a page
 * that shows only one example can't say which are.
 */
const inferSchema = (value: unknown): JsonSchema => withItems(observeSchema(value));

const parameterTypeOf = (type: string): 'integer' | 'number' | 'boolean' | 'string' => {
  if (/^integer/i.test(type)) return 'integer';
  if (/^(number|float|double)/i.test(type)) return 'number';
  if (/^bool/i.test(type)) return 'boolean';
  return 'string';
};

const toLiteral = (text: string, type: string): unknown => {
  if (type === 'integer' || type === 'number') {
    const number = Number(text);
    return text !== '' && Number.isFinite(number) ? number : text;
  }
  return type === 'boolean' && (text === 'true' || text === 'false') ? text === 'true' : text;
};

interface DocumentedParameter {
  readonly name: string;
  readonly type: ReturnType<typeof parameterTypeOf>;
  readonly required: boolean;
  readonly description: string;
  readonly example: string;
}

// A "URI Parameters" block is a definition list: `<dt>limit</dt><dd><code>integer</code>
// (optional) Example: 500 <p>The maximum number of records.</p></dd>`.
const readDocumentedParameters = (
  $: CheerioAPI,
  action: Cheerio<AnyNode>
): Map<string, DocumentedParameter> => {
  const parameters = new Map<string, DocumentedParameter>();
  const title = action
    .find('.title')
    .filter((_, element) => textOf($(element).find('strong').first()) === 'URI Parameters')
    .first();
  title
    .next('.collapse-content')
    .find('dt')
    .each((_, dt) => {
      const name = textOf($(dt));
      const definition = $(dt).next('dd');
      parameters.set(name, {
        name,
        type: parameterTypeOf(textOf(definition.children('code').first())),
        required: definition.find('.required').length > 0,
        description: textOf(definition.children('p').first()),
        example: textOf(definition.find('.example span').last()),
      });
    });
  return parameters;
};

const toParameter = (
  location: 'path' | 'query',
  name: string,
  documented: DocumentedParameter | undefined
) => ({
  name,
  in: location,
  required: location === 'path' || (documented?.required ?? false),
  ...(documented?.description ? { description: documented.description } : {}),
  schema: { type: documented?.type ?? 'string' },
  ...(documented?.example ? { example: toLiteral(documented.example, documented.type) } : {}),
});

interface ExchangeBlock {
  /** `Request`, or `Response 200`. */
  readonly title: string;
  readonly headers: string;
  readonly body: string;
  readonly description: string;
}

const readExchangeBlocks = ($: CheerioAPI, action: Cheerio<AnyNode>): ExchangeBlock[] =>
  action
    .find('.title')
    .toArray()
    .flatMap((element) => {
      const title = textOf($(element).find('strong').first());
      if (!/^(Request|Response)\b/.test(title)) {
        return [];
      }
      const content = $(element).next('.collapse-content');
      const section = (heading: string) =>
        content
          .find('h5')
          .filter((_, h) => textOf($(h)) === heading)
          .next('pre')
          .text();
      return [
        {
          title,
          headers: section('Headers'),
          body: section('Body'),
          description: textOf(content.find('.description').first()),
        },
      ];
    });

const contentTypeOf = (headers: string): string =>
  /Content-Type:\s*([^\s;]+)/i.exec(headers)?.[1] ?? 'application/json';

const toOperation = ($: CheerioAPI, element: AnyNode, path: string, queryNames: string[]) => {
  const action = $(element);
  const heading = action.find('h4.action-heading').first();
  const documented = readDocumentedParameters($, action);
  const blocks = readExchangeBlocks($, action);

  const pathNames = [...path.matchAll(PATH_PARAMETER)].map(([, name]) => name);
  const queryOnPage = [...documented.keys()].filter((name) => !pathNames.includes(name));
  const parameters = [
    ...pathNames.map((name) => toParameter('path', name, documented.get(name))),
    ...[...new Set([...queryNames, ...queryOnPage])].map((name) =>
      toParameter('query', name, documented.get(name))
    ),
  ];

  const request = blocks.find(({ title }) => title.startsWith('Request'));
  const requestExample = request ? parseJson(request.body) : undefined;
  const summary = textOf(heading.find('.name'));
  const description = textOf(action.children('p').first());

  const responses = Object.fromEntries(
    blocks
      .filter(({ title }) => title.startsWith('Response'))
      .map(({ title, headers, body, description: text }) => {
        const status = /^Response\s+(\d{3})/.exec(title)?.[1] ?? 'default';
        const example = parseJson(body);
        return [
          status,
          {
            description: text || `Response ${status}`,
            ...(example === undefined
              ? {}
              : {
                  content: {
                    [contentTypeOf(headers)]: { schema: inferSchema(example), example },
                  },
                }),
          },
        ];
      })
  );

  return {
    ...(action.attr('id') ? { operationId: action.attr('id') } : {}),
    ...(summary ? { summary } : {}),
    ...(description ? { description } : {}),
    parameters,
    ...(requestExample === undefined
      ? {}
      : {
          requestBody: {
            required: true,
            content: {
              [contentTypeOf(request?.headers ?? '')]: { schema: inferSchema(requestExample) },
            },
          },
        }),
    responses:
      Object.keys(responses).length > 0 ? responses : { '200': { description: 'Response' } },
    ...(request && /Authorization:/i.test(request.headers)
      ? { security: [{ BearerAuth: [] }] }
      : {}),
  };
};

/**
 * Converts a vendor's Aglio-rendered API reference to an OpenAPI 3.0 document. Each action gives a
 * method, a URI template, its "URI Parameters" with their types, and the example bodies and
 * statuses of its requests and responses. The page lists no schemas, so request and response
 * schemas are inferred from the examples: their types and properties, none of them required.
 * Actions that share a method and path keep the first one. A page with no actions is an error.
 */
export const convertAglioReference = ({
  format,
  html,
  version = '1',
}: AglioReferenceOptions): OpenApiDocument => {
  const { title, servers } = FORMATS[format];
  const $ = load(html);
  // Header lines are separated by `<br>`, which `text()` would drop.
  $('pre br').replaceWith('\n');
  const paths: Record<string, Record<string, unknown>> = {};

  $('.action')
    .toArray()
    .forEach((element) => {
      const heading = $(element).find('h4.action-heading').first();
      const method = textOf(heading.find('.method')).toLowerCase();
      const template = textOf(heading.find('code.uri'));
      if (!METHODS.has(method) || template === '') {
        return;
      }
      const queryNames = (QUERY_TEMPLATE.exec(template)?.[1] ?? '')
        .split(',')
        .map((name) => name.replace(/\*$/, '').trim())
        .filter(Boolean);
      const path = template.replace(QUERY_TEMPLATE, '');
      const item = paths[path] ?? {};
      if (!(method in item)) {
        paths[path] = { ...item, [method]: toOperation($, element, path, queryNames) };
      }
    });

  // A landing page served with a 200, or a renderer change that breaks the selectors above, would
  // otherwise load as an API with no endpoints, and drift would report them all missing.
  if (Object.keys(paths).length === 0) {
    throw new Error('No operations found in the Aglio API reference; is the URL its page?');
  }

  return {
    openapi: '3.0.3',
    info: { title, version },
    servers,
    paths,
    components: {
      securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer' } },
    },
  };
};
