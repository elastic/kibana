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
}

const TEMPLATE_PARAMETER = /\{([^}]+)\}/;

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Splitting on a capturing pattern alternates literal text (even indexes) and parameter names.
const compileTemplate = (template: string, toPattern: (name: string) => string): string =>
  template
    .split(TEMPLATE_PARAMETER)
    .map((part, index) => (index % 2 === 0 ? escapeRegExp(part) : toPattern(part)))
    .join('');

const compileServer = ({ url, variables }: OperationServer): ServerPrefix => {
  const source = compileTemplate(url.replace(/\/+$/, ''), (name) => {
    const values = variables[name]?.enum ?? [];
    return values.length > 0 ? `(?:${values.map(escapeRegExp).join('|')})` : '[^/]*';
  });
  return { regExp: new RegExp(`^${source}(?=/|$)`, 'i'), relative: url.startsWith('/') };
};

const compileRoute = (operation: ContractOperation): Route => {
  const parameterNames: string[] = [];
  const source = compileTemplate(operation.path, (name) => {
    parameterNames.push(name);
    return '([^/]+)';
  });
  return {
    operation,
    servers: operation.servers.map(compileServer),
    path: new RegExp(`^${source}$`),
    parameterNames,
  };
};

// Strips the longest matching server URL, e.g. `https://api.trello.com/1` from a Trello URL.
const getOperationPath = ({ servers }: Route, url: URL): string | undefined => {
  if (servers.length === 0) {
    return url.pathname;
  }
  const prefixes = servers.flatMap(({ regExp, relative }) => {
    const target = relative ? url.pathname : `${url.origin}${url.pathname}`;
    const match = regExp.exec(target);
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
 * the one with the fewest parameters wins, so `/items/new` takes precedence over `/items/{id}`.
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
      .sort((a, b) => a.route.parameterNames.length - b.route.parameterNames.length);
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
