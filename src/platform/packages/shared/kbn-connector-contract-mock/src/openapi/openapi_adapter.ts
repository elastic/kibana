/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IPrismDiagnostic } from '@stoplight/prism-core';
import route from '@stoplight/prism-http/dist/router';
import { convertTemplateToRegExp } from '@stoplight/prism-http/dist/router/matchBaseUrl';
import { validateInput, validateOutput } from '@stoplight/prism-http/dist/validator';
import type { HttpMethod } from '@stoplight/types';
import { DiagnosticSeverity } from '@stoplight/types';
import * as E from 'fp-ts/Either';
import type {
  ContractAdapter,
  ContractRequest,
  Responder,
  RouteResult,
  Violation,
} from '../contract/types';
import type { ContractOperation } from './types';

const toViolations = (diagnostics: readonly IPrismDiagnostic[]): Violation[] =>
  diagnostics
    .filter(({ severity }) => severity === DiagnosticSeverity.Error)
    .map(({ path = [], code = '', message }) => ({
      path: path.map(String),
      code: String(code),
      message,
    }));

// Prism accepts query strings that the vendor would reject, so check these separately.
const checkQueryEncoding = (
  { request }: ContractOperation,
  { query }: ContractRequest
): Violation[] => {
  const parameters = request?.query ?? [];
  const undeclared = Object.keys(query)
    .filter(
      (key) =>
        !parameters.some(
          ({ name, style }) =>
            key === name || (style === 'deepObject' && key.startsWith(`${name}[`))
        )
    )
    .map((key) => ({
      path: ['query', key],
      code: 'undeclared',
      message: `Request query parameter ${key} is not declared by the operation`,
    }));
  const repeated = parameters
    .filter(
      ({ name, explode, style = 'form' }) =>
        explode === false && style === 'form' && Array.isArray(query[name])
    )
    .map(({ name }) => ({
      path: ['query', name],
      code: 'explode',
      message: `Request query parameter ${name} must be comma-separated (explode: false), not repeated`,
    }));
  return [...undeclared, ...repeated];
};

// Prism matches `baseUrl` exactly against a server URL, so a full vendor URL is split at the
// end of the longest server URL that prefixes it, e.g. `https://api.trello.com/1` + `/cards`.
const createUrlSplitter = (operations: readonly ContractOperation[]) => {
  const prefixes = new Map<string, RegExp>();
  for (const { servers = [] } of operations) {
    for (const { url, variables } of servers) {
      const template = url.replace(/\/+$/, '');
      const regExp = convertTemplateToRegExp(template, variables);
      if (!prefixes.has(template) && E.isRight(regExp)) {
        prefixes.set(template, new RegExp(regExp.right.source.replace(/\$$/, '(?=/|$)')));
      }
    }
  }
  return (url: URL): { baseUrl?: string; path: string } => {
    if (prefixes.size === 0) {
      return { path: url.pathname };
    }
    const target = `${url.origin}${url.pathname}`;
    const baseUrl = [...prefixes.values()]
      .map((prefix) => prefix.exec(target)?.[0] ?? '')
      .reduce((longest, match) => (match.length > longest.length ? match : longest), '');
    return baseUrl
      ? { baseUrl, path: target.slice(baseUrl.length) || '/' }
      : { baseUrl: url.origin, path: url.pathname };
  };
};

const HTTP_METHODS: readonly HttpMethod[] = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
];

const isHttpMethod = (method: string): method is HttpMethod =>
  HTTP_METHODS.some((candidate) => candidate === method);

/** Implements the contract steps for OpenAPI specs on top of Prism's router and validator. */
export const createOpenApiAdapter = (
  operations: ContractOperation[],
  respond: Responder
): ContractAdapter => {
  const splitUrl = createUrlSplitter(operations);
  const toPrismRequest = ({ method, url, query, headers, body }: ContractRequest) => ({
    method: isHttpMethod(method) ? method : 'get',
    url: { ...splitUrl(url), query: { ...query } },
    headers: { ...headers },
    body,
  });

  return {
    route: (request): RouteResult => {
      if (!isHttpMethod(request.method)) {
        return { status: 405, message: `Unsupported method ${request.method}` };
      }
      const routed = route({ resources: operations, input: toPrismRequest(request) });
      if (E.isLeft(routed)) {
        const { left } = routed;
        const status = 'status' in left && typeof left.status === 'number' ? left.status : 404;
        return { status, message: left.message };
      }
      const operation = operations.find((candidate) => candidate === routed.right);
      return operation ? { operation } : { status: 404, message: 'No matching operation' };
    },
    validateRequest: (operation, request) => {
      const prismRequest = toPrismRequest(request);
      const validated = validateInput({ resource: operation, element: prismRequest });
      return [
        ...(E.isLeft(validated) ? toViolations(validated.left) : []),
        ...checkQueryEncoding(operation, request),
      ];
    },
    respond,
    validateResponse: (operation, { statusCode, headers, body }) => {
      const element = { statusCode, headers: { ...headers }, body };
      const validated = validateOutput({ resource: operation, element });
      return E.isLeft(validated) ? toViolations(validated.left) : [];
    },
  };
};
