/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadOperations } from './load_operations';
import { createOperationMatcher } from './match_operation';

const ok = { '200': { description: 'ok' } };

const createMatcher = (servers: Array<Record<string, unknown>>) =>
  createOperationMatcher(
    loadOperations({
      openapi: '3.0.3',
      info: { title: 'Test', version: '1' },
      servers,
      paths: {
        '/items': { get: { operationId: 'list', responses: ok } },
        '/items/{id}': {
          get: { operationId: 'get', responses: ok },
          delete: { operationId: 'delete', responses: ok },
        },
        '/items/new': { get: { operationId: 'new', responses: ok } },
        '/items/{id}:archive': { get: { operationId: 'archive', responses: ok } },
      },
    })
  );

const match = (matcher: ReturnType<typeof createMatcher>, method: string, url: string) => {
  const result = matcher(method, new URL(url));
  return 'operation' in result
    ? { operation: result.operation.id, pathParameters: result.pathParameters }
    : result;
};

describe('createOperationMatcher', () => {
  it('matches the path after the server URL and decodes path parameters', () => {
    const matcher = createMatcher([{ url: 'https://api.example.com/1' }]);

    expect(match(matcher, 'GET', 'https://api.example.com/1/items/a%20b')).toEqual({
      operation: 'get',
      pathParameters: { id: 'a b' },
    });
    expect(match(matcher, 'GET', 'https://api.example.com/1/items')).toMatchObject({
      operation: 'list',
    });
  });

  it('matches path parameters marked x-ms-skip-url-encoding across segments', () => {
    const scoped = (multiSegment: boolean) =>
      createOperationMatcher(
        loadOperations({
          openapi: '3.0.3',
          info: { title: 'Test', version: '1' },
          servers: [{ url: 'https://management.azure.com' }],
          paths: {
            '/{scope}/providers/Microsoft.AlertsManagement/alerts': {
              get: {
                operationId: 'listAlerts',
                parameters: [
                  {
                    name: 'scope',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' },
                    ...(multiSegment ? { 'x-ms-skip-url-encoding': true } : {}),
                  },
                ],
                responses: ok,
              },
            },
          },
        })
      );
    const url =
      'https://management.azure.com/subscriptions/s1/providers/Microsoft.AlertsManagement/alerts';

    expect(match(scoped(true), 'GET', url)).toEqual({
      operation: 'listAlerts',
      pathParameters: { scope: 'subscriptions/s1' },
    });
    expect(match(scoped(false), 'GET', url)).toMatchObject({ status: 404 });
  });

  it('prefers templates without parameters spanning segments over a catch-all', () => {
    const resourceId = {
      name: 'resourceId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      'x-ms-skip-url-encoding': true,
    };
    const matcher = createOperationMatcher(
      loadOperations({
        openapi: '3.0.3',
        info: { title: 'Test', version: '1' },
        servers: [{ url: 'https://management.azure.com' }],
        paths: {
          '/{resourceId}': {
            get: { operationId: 'getById', parameters: [resourceId], responses: ok },
          },
          '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContainerService/managedClusters/{resourceName}':
            { get: { operationId: 'getCluster', responses: ok } },
        },
      })
    );

    expect(
      match(
        matcher,
        'GET',
        'https://management.azure.com/subscriptions/s1/resourceGroups/rg/providers/Microsoft.ContainerService/managedClusters/c1'
      )
    ).toMatchObject({ operation: 'getCluster' });
    expect(
      match(matcher, 'GET', 'https://management.azure.com/subscriptions/s1/resourceGroups/rg')
    ).toEqual({
      operation: 'getById',
      pathParameters: { resourceId: 'subscriptions/s1/resourceGroups/rg' },
    });
  });

  it('prefers the operations it is told to of those two sources describe', () => {
    const spec = (title: string) => ({
      openapi: '3.0.3',
      info: { title, version: '1' },
      servers: [{ url: 'https://api.example.com' }],
      paths: { '/items': { get: { operationId: `${title}List`, responses: ok } } },
    });
    const operations = [
      ...loadOperations(spec('first'), 'first'),
      ...loadOperations(spec('second'), 'second'),
    ];
    const url = 'https://api.example.com/items';

    expect(match(createOperationMatcher(operations), 'GET', url)).toMatchObject({
      operation: 'firstList',
    });
    expect(
      match(
        createOperationMatcher(operations, {
          isPreferred: ({ spec: { source } }) => source === 'second',
        }),
        'GET',
        url
      )
    ).toMatchObject({ operation: 'secondList' });
  });

  it('treats a trailing slash as optional, unless the spec spells both', () => {
    const matcher = (paths: string[]) =>
      createOperationMatcher(
        loadOperations({
          openapi: '3.0.3',
          info: { title: 'Test', version: '1' },
          servers: [{ url: 'https://api.example.com' }],
          paths: Object.fromEntries(
            paths.map((path) => [path, { get: { operationId: path, responses: ok } }])
          ),
        })
      );
    const scan = matcher(['/scan', '/items/{id}/']);

    expect(match(scan, 'GET', 'https://api.example.com/scan/')).toMatchObject({
      operation: '/scan',
    });
    expect(match(scan, 'GET', 'https://api.example.com/items/a')).toEqual({
      operation: '/items/{id}/',
      pathParameters: { id: 'a' },
    });

    const both = matcher(['/scan', '/scan/']);
    expect(match(both, 'GET', 'https://api.example.com/scan')).toMatchObject({
      operation: '/scan',
    });
    expect(match(both, 'GET', 'https://api.example.com/scan/')).toMatchObject({
      operation: '/scan/',
    });
  });

  it('matches server URL variables by their enum values', () => {
    const matcher = createMatcher([
      {
        url: 'https://{region}.example.com',
        variables: { region: { default: 'us', enum: ['us', 'eu'] } },
      },
    ]);

    expect(match(matcher, 'GET', 'https://eu.example.com/items')).toMatchObject({
      operation: 'list',
    });
    expect(match(matcher, 'GET', 'https://ap.example.com/items')).toMatchObject({ status: 404 });
  });

  it('matches relative server URLs and specs without servers against the path', () => {
    expect(
      match(createMatcher([{ url: '/api' }]), 'GET', 'https://any.example.com/api/items')
    ).toMatchObject({ operation: 'list' });
    expect(match(createMatcher([]), 'GET', 'https://any.example.com/items')).toMatchObject({
      operation: 'list',
    });
  });

  it('prefers literal path segments over template parameters', () => {
    const matcher = createMatcher([{ url: 'https://api.example.com' }]);

    expect(match(matcher, 'GET', 'https://api.example.com/items/new')).toMatchObject({
      operation: 'new',
    });
  });

  it('prefers the template with more literal text among as many parameters', () => {
    const matcher = createMatcher([{ url: 'https://api.example.com' }]);

    expect(match(matcher, 'GET', 'https://api.example.com/items/a:archive')).toEqual({
      operation: 'archive',
      pathParameters: { id: 'a' },
    });
  });

  it('answers 404 for unknown paths and 405 naming the allowed methods', () => {
    const matcher = createMatcher([{ url: 'https://api.example.com' }]);

    expect(match(matcher, 'GET', 'https://api.example.com/other')).toEqual({
      status: 404,
      message: 'No operation matches the path',
    });
    expect(match(matcher, 'PUT', 'https://api.example.com/items/1')).toEqual({
      status: 405,
      message: 'The path only allows GET, DELETE',
    });
    expect(match(matcher, 'GET', 'https://other.example.com/items')).toMatchObject({
      status: 404,
    });
  });
});
