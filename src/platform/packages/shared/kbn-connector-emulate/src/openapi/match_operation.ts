/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractOperation, OperationServer } from './types';

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
  /** Whether the server's captures are path parameters the request's path leaves out. */
  readonly suppliesPath: boolean;
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

const serverVariablePattern = (variables: OperationServer['variables'], name: string): string => {
  const values = variables[name]?.enum ?? [];
  return values.length > 0 ? `(?:${values.map(escapeRegExp).join('|')})` : '[^/]*';
};

const compileServerTemplate = ({ url, variables }: OperationServer): string =>
  compileTemplate(url.replace(/\/+$/, ''), (name) => serverVariablePattern(variables, name));

const compileServer = ({ url, variables }: OperationServer): ServerPrefix => {
  let suppliesPath = false;
  const source = compileTemplate(url.replace(/\/+$/, ''), (name) => {
    if (variables[name]?.pathParameter) {
      suppliesPath = true;
      return '([^/]+?)';
    }
    return serverVariablePattern(variables, name);
  });
  return {
    regExp: new RegExp(`^${source}(?=/|$)`, 'i'),
    relative: url.startsWith('/'),
    suppliesPath,
  };
};

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
  fixedQuery.every(({ name, value, optional }) =>
    optional && !url.searchParams.has(name)
      ? true
      : value === undefined
      ? url.searchParams.has(name)
      : url.searchParams.getAll(name).includes(value)
  );

const fixedQueryCount = ({ operation: { fixedQuery = [] } }: Route, url: URL): number =>
  fixedQuery.filter(({ name, optional }) => !optional || url.searchParams.has(name)).length;

// Operations on the same path that only differ in their query parameters, such as S3's
// `GetObject` and `ListParts` (which requires `uploadId`), are told apart by the query: first
// by the required parameters the request leaves out, then by how many of its parameters each
// declares.
const missingQueryCount = ({ operation: { parameters } }: Route, url: URL): number =>
  parameters.filter(
    ({ in: location, required, name }) =>
      location === 'query' && required && !url.searchParams.has(name)
  ).length;

const declaredQueryCount = ({ operation: { parameters } }: Route, url: URL): number =>
  [...new Set(url.searchParams.keys())].filter((key) =>
    parameters.some(({ in: location, name }) => location === 'query' && name === key)
  ).length;

// Strips the longest matching server URL, e.g. `https://api.trello.com/1` from a Trello URL.
const getOperationPath = ({ servers }: Route, url: URL): string | undefined => {
  if (servers.length === 0) {
    return url.pathname;
  }
  const prefixes = servers.flatMap((server) => {
    const target = toMatchTarget(server, url);
    const match = server.regExp.exec(target);
    if (!match) {
      return [];
    }
    const rest = target.slice(match[0].length) || '/';
    // `https://logs.s3.eu-west-1.amazonaws.com/2024/app.log` is `/logs/2024/app.log`.
    return server.suppliesPath
      ? [`/${match.slice(1).join('/')}${rest === '/' ? '' : rest}`]
      : [rest];
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
 * `/items/{id}`, then the one with the most fixed query parameters (`x-ms-paths`), so
 * `/?restype=service&comp=properties` takes precedence over `/?comp=properties`.
 */
export const createOperationMatcher = (operations: readonly ContractOperation[]) => {
  const routes = operations.map(compileRoute);

  return (method: string, url: URL): OperationMatch | OperationMismatch => {
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
    const [best] = candidates
      .filter(({ route }) => route.operation.method === method.toLowerCase())
      .sort(
        (a, b) =>
          a.route.parameterNames.length - b.route.parameterNames.length ||
          b.route.literalLength - a.route.literalLength ||
          fixedQueryCount(b.route, url) - fixedQueryCount(a.route, url) ||
          missingQueryCount(a.route, url) - missingQueryCount(b.route, url) ||
          declaredQueryCount(b.route, url) - declaredQueryCount(a.route, url)
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
