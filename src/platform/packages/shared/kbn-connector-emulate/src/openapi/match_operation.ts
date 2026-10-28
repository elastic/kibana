/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAtPointer, refToPointer } from './json_pointer';
import { isRecord } from './schema_walk';
import type { ContractOperation, OperationParameter, OperationServer } from './types';

export interface OperationMatch {
  readonly operation: ContractOperation;
  /** Raw path parameter values, percent-decoded but not yet deserialized. */
  readonly pathParameters: Readonly<Record<string, string>>;
}

export interface OperationMismatch {
  readonly status: 404 | 405;
  readonly message: string;
}

interface ServerPrefix {
  readonly regExp: RegExp;
  /** Relative server URLs such as `/api/v2` are matched against the path only. */
  readonly relative: boolean;
}

interface Route {
  readonly operation: ContractOperation;
  readonly servers: readonly ServerPrefix[];
  readonly path: RegExp;
  readonly parameterNames: readonly string[];
  /** The length of the template's text outside parameters. */
  readonly literalLength: number;
}

const TEMPLATE_PARAMETER = /\{([^}]+)\}/;

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Splitting on a capturing pattern alternates literal text (even indexes) and parameter names.
const compileTemplate = (template: string, toPattern: (name: string) => string): string =>
  template
    .split(TEMPLATE_PARAMETER)
    .map((part, index) => (index % 2 === 0 ? escapeRegExp(part) : toPattern(part)))
    .join('');

const compileServerTemplate = ({ url, variables }: OperationServer): string =>
  compileTemplate(url.replace(/\/+$/, ''), (name) => {
    const values = variables[name]?.enum ?? [];
    return values.length > 0 ? `(?:${values.map(escapeRegExp).join('|')})` : '[^/]*';
  });

const compileServer = (server: OperationServer): ServerPrefix => ({
  regExp: new RegExp(`^${compileServerTemplate(server)}(?=/|$)`, 'i'),
  relative: server.url.startsWith('/'),
});

const toMatchTarget = ({ relative }: ServerPrefix, url: URL): string =>
  relative ? url.pathname : `${url.origin}${url.pathname}`;

const ORIGIN = /^([a-z][a-z\d+.-]*:\/\/[^/]*)(.*)$/i;

/**
 * Returns whether a request URL, without query string, is the whole of a server-style URL
 * template. Only the origin is matched case-insensitively, since paths are case-sensitive.
 */
export const compileUrlMatcher = ({ url, variables }: OperationServer): ((url: URL) => boolean) => {
  const [, origin, path = url] = ORIGIN.exec(url) ?? [];
  const originRegExp =
    origin === undefined
      ? undefined
      : new RegExp(`^${compileServerTemplate({ url: origin, variables })}$`, 'i');
  const pathRegExp = new RegExp(`^${compileServerTemplate({ url: path, variables })}/?$`);
  return (request) =>
    (originRegExp === undefined || originRegExp.test(request.origin)) &&
    pathRegExp.test(request.pathname);
};

const compileRoute = (operation: ContractOperation): Route => {
  const parameterNames: string[] = [];
  const multiSegment = new Set(
    operation.parameters
      .filter((parameter) => parameter.in === 'path' && parameter.multiSegment)
      .map(({ name }) => name)
  );
  // `x-ms-paths` keys end in the operation's fixed query parameters.
  const [template] = operation.path.split('?');
  const source = compileTemplate(template, (name) => {
    parameterNames.push(name);
    return multiSegment.has(name) ? '(.+?)' : '([^/]+)';
  });
  return {
    operation,
    servers: operation.servers.map(compileServer),
    path: new RegExp(`^${source}$`),
    parameterNames,
    literalLength: template.replace(new RegExp(TEMPLATE_PARAMETER, 'g'), '').length,
  };
};

const hasFixedQuery = ({ operation: { fixedQuery = [] } }: Route, url: URL): boolean =>
  fixedQuery.every(({ name, value }) => url.searchParams.getAll(name).includes(value));

const fixedQueryCount = ({ operation: { fixedQuery = [] } }: Route): number => fixedQuery.length;

/** The query string and lowercase headers a request sends, for telling operations apart. */
export interface RequestDiscriminators {
  readonly url: URL;
  readonly headers?: Readonly<Record<string, string>>;
}

// The one value a required parameter allows, such as `comp: ['list']` or
// `x-ms-lease-action: ['acquire']` in Azure specs, which tells operations on a path apart.
const singleValue = (
  { required, schema }: OperationParameter,
  operation: ContractOperation
): string | undefined => {
  if (!required || !schema || !isRecord(schema.schema)) {
    return undefined;
  }
  const {
    spec: { document, dialect },
  } = operation;
  // The values every `enum` and `const` along the `$ref` chain allow, as specs alias shared
  // enums. OpenAPI 3.1 applies the keywords next to a `$ref` too; 3.0 ignores them.
  let allowed: unknown[] | undefined;
  const visited = new Set<string>();
  let node: unknown = schema.schema;
  while (isRecord(node)) {
    const { $ref } = node;
    const isRef = typeof $ref === 'string';
    if (!isRef || dialect === 'draft-2020-12') {
      const own = Array.isArray(node.enum) ? node.enum : 'const' in node ? [node.const] : undefined;
      if (own) {
        allowed = allowed === undefined ? own : allowed.filter((value) => own.includes(value));
      }
    }
    if (!isRef) {
      break;
    }
    if (visited.has($ref)) {
      return undefined;
    }
    visited.add($ref);
    try {
      node = getAtPointer(document, refToPointer($ref));
    } catch {
      return undefined;
    }
    if (!isRecord(node)) {
      return undefined;
    }
  }
  return allowed?.length === 1 && ['string', 'number', 'boolean'].includes(typeof allowed[0])
    ? String(allowed[0])
    : undefined;
};

const sentValues = (
  { name, in: location }: OperationParameter,
  { url, headers = {} }: RequestDiscriminators
): string[] | undefined => {
  if (location === 'query') {
    return url.searchParams.has(name) ? url.searchParams.getAll(name) : undefined;
  }
  const header = location === 'header' ? headers[name.toLowerCase()] : undefined;
  return header === undefined ? undefined : [header];
};

interface Discrimination {
  /** A discriminator the request sends with another value. */
  readonly conflicts: boolean;
  /** The fixed query parameters, and the declared ones the request sends without a conflict. */
  readonly matched: number;
  /** The required query and header parameters the request doesn't send. */
  readonly missing: number;
}

const discriminate = ({ operation }: Route, request: RequestDiscriminators): Discrimination => {
  const matched = new Set((operation.fixedQuery ?? []).map(({ name }) => name));
  let conflicts = false;
  let missing = 0;
  for (const parameter of operation.parameters) {
    if (parameter.in !== 'query' && parameter.in !== 'header') {
      continue;
    }
    const sent = sentValues(parameter, request);
    if (sent === undefined) {
      missing += parameter.required ? 1 : 0;
      continue;
    }
    const value = singleValue(parameter, operation);
    if (value === undefined || sent.includes(value)) {
      matched.add(parameter.name);
    } else {
      conflicts = true;
    }
  }
  return { conflicts, matched: matched.size, missing };
};

// Strips the longest matching server URL, e.g. `https://api.trello.com/1` from a Trello URL.
const getOperationPath = ({ servers }: Route, url: URL): string | undefined => {
  if (servers.length === 0) {
    return url.pathname;
  }
  const prefixes = servers.flatMap((server) => {
    const target = toMatchTarget(server, url);
    const match = server.regExp.exec(target);
    return match ? [target.slice(match[0].length) || '/'] : [];
  });
  return prefixes.reduce<string | undefined>(
    (shortest, path) => (shortest === undefined || path.length < shortest.length ? path : shortest),
    undefined
  );
};

const decodePathSegment = (segment: string): string => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

/**
 * Creates a router that finds the operation for a request. When several path templates match,
 * the one with the fewest parameters wins, so `/items/new` takes precedence over `/items/{id}`,
 * then the one with the most literal text, so `/items/{id}:archive` takes precedence over
 * `/items/{id}`. Operations on that template, as `x-ms-paths` declares them, are told apart by
 * the query parameters their keys fix and their required parameters with one allowed value:
 * those the request sends with another value are left out, unless every operation is, then the
 * one with the most fixed query parameters wins, then the one that declares the most of the query
 * and header parameters the request sends, then the one with the fewest required parameters
 * missing. So `/?restype=service&comp=properties` takes precedence over `/?comp=properties`, and
 * a lease request goes to the operation whose `x-ms-lease-action` it sends.
 */
export const createOperationMatcher = (operations: readonly ContractOperation[]) => {
  const routes = operations.map(compileRoute);

  return (
    method: string,
    url: URL,
    headers?: Readonly<Record<string, string>>
  ): OperationMatch | OperationMismatch => {
    const pathMatches = routes.flatMap((route) => {
      const path = getOperationPath(route, url);
      const match = path === undefined ? null : route.path.exec(path);
      return match ? [{ route, values: match.slice(1) }] : [];
    });
    if (pathMatches.length === 0) {
      return { status: 404, message: 'No operation matches the path' };
    }
    const candidates = pathMatches.filter(({ route }) => hasFixedQuery(route, url));
    if (candidates.length === 0) {
      const expected = [...new Set(pathMatches.map(({ route }) => route.operation.path))];
      return {
        status: 404,
        message: `No operation matches the query; operations on the path expect ${expected.join(
          ', or '
        )}`,
      };
    }
    const forMethod = candidates.filter(
      ({ route }) => route.operation.method === method.toLowerCase()
    );
    // The most specific path template wins first, so `/items/new` takes precedence over
    // `/items/{id}` whatever the request's parameters; discriminators only tell apart operations
    // on that template, as `x-ms-paths` declares them.
    const specificity = ({ route }: (typeof forMethod)[number]) =>
      [route.parameterNames.length, -route.literalLength] as const;
    const [mostSpecific] = forMethod.map(specificity).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const onTemplate = forMethod
      .filter((candidate) => {
        const [parameters, literal] = specificity(candidate);
        return parameters === mostSpecific[0] && literal === mostSpecific[1];
      })
      .map((candidate) => ({ ...candidate, ...discriminate(candidate.route, { url, headers }) }));
    // A conflicting discriminator rules an operation out only when another is left, so a request
    // to a single operation still reaches validation, which names the wrong value.
    const consistent = onTemplate.filter(({ conflicts }) => !conflicts);
    const [best] = (consistent.length > 0 ? consistent : onTemplate).sort(
      (a, b) =>
        fixedQueryCount(b.route) - fixedQueryCount(a.route) ||
        b.matched - a.matched ||
        a.missing - b.missing
    );
    if (!best) {
      const allowed = [...new Set(candidates.map(({ route }) => route.operation.method))];
      return {
        status: 405,
        message: `The path only allows ${allowed.map((name) => name.toUpperCase()).join(', ')}`,
      };
    }
    const { route, values } = best;
    return {
      operation: route.operation,
      pathParameters: Object.fromEntries(
        route.parameterNames.map((name, index) => [name, decodePathSegment(values[index])])
      ),
    };
  };
};
