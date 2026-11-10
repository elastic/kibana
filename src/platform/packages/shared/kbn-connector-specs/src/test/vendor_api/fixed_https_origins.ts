/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '@kbn/connector-emulate';
import { isGraphQLSpec, isMcpSpec, loadContractOperations } from '@kbn/connector-emulate';
import { isJsonObject } from './json_pointer';

const rootServerUrlsOf = ({ servers }: OpenApiDocument): unknown[] =>
  (Array.isArray(servers) ? servers : []).map((server) =>
    isJsonObject(server) ? server.url : undefined
  );

// GraphQL and MCP specs have no operations by path, and are served at their root servers.
const operationServerUrlsOf = (spec: OpenApiDocument): string[] =>
  isGraphQLSpec(spec) || isMcpSpec(spec)
    ? []
    : loadContractOperations(spec).flatMap(({ servers }) => servers.map(({ url }) => url));

const tokenUrlsOf = ({ components }: OpenApiDocument): unknown[] => {
  const { securitySchemes } = isJsonObject(components) ? components : { securitySchemes: {} };
  return Object.values(isJsonObject(securitySchemes) ? securitySchemes : {})
    .flatMap((scheme) => (isJsonObject(scheme) && isJsonObject(scheme.flows) ? [scheme.flows] : []))
    .flatMap((flows) => Object.values(flows))
    .flatMap((flow) => (isJsonObject(flow) ? [flow.tokenUrl, flow.refreshUrl] : []));
};

// Variables in the path, such as `https://api.example.com/{version}`, leave the origin fixed.
const FIXED_HTTPS_ORIGIN = /^https:\/\/[^/?#{}]+(?:[/?#]|$)/;

const isFixedHttpsUrl = (url: unknown): url is string =>
  typeof url === 'string' && FIXED_HTTPS_ORIGIN.test(url);

/**
 * The HTTPS origins the contract mock serves whatever the connector's config says: those of the
 * specs' servers, at any level, and of absolute OAuth token URLs. Origins with variables, such as
 * `https://{subdomain}.zendesk.com`, depend on connector config, and relative URLs on a server.
 */
export const fixedHttpsOrigins = (specs: Readonly<Record<string, OpenApiDocument>>): string[] => {
  const urls = Object.values(specs).flatMap((spec) => [
    ...rootServerUrlsOf(spec),
    ...operationServerUrlsOf(spec),
    ...tokenUrlsOf(spec),
  ]);
  const origins = urls.flatMap((url) => (isFixedHttpsUrl(url) ? [new URL(url).origin] : []));
  return [...new Set(origins)].sort();
};
