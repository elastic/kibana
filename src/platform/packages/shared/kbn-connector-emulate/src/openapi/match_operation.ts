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
  const source = compileTemplate(operation.path, (name) => {
    parameterNames.push(name);
    return multiSegment.has(name) ? '(.+?)' : '([^/]+)';
  });
  return {
    operation,
    servers: operation.servers.map(compileServer),
    path: new RegExp(`^${source}$`),
    parameterNames,
    literalLength: operation.path.replace(new RegExp(TEMPLATE_PARAMETER, 'g'), '').length,
  };
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
 * `/items/{id}`.
 */
export const createOperationMatcher = (operations: readonly ContractOperation[]) => {
  const routes = operations.map(compileRoute);

  return (method: string, url: URL): OperationMatch | OperationMismatch => {
    const candidates = routes.flatMap((route) => {
      const path = getOperationPath(route, url);
      const match = path === undefined ? null : route.path.exec(path);
      return match ? [{ route, values: match.slice(1) }] : [];
    });
    if (candidates.length === 0) {
      return { status: 404, message: 'No operation matches the path' };
    }
    const [best] = candidates
      .filter(({ route }) => route.operation.method === method.toLowerCase())
      .sort(
        (a, b) =>
          a.route.parameterNames.length - b.route.parameterNames.length ||
          b.route.literalLength - a.route.literalLength
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
