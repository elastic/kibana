/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertAglioReference, isAglioReferenceFormat } from './convert_aglio_reference';

const block = (title: string, headers: string, body: string, description = '') =>
  `<div class="title"><strong>${title}</strong></div>` +
  `<div class="collapse-content"><div class="inner">` +
  `${description ? `<div class="description"><p>${description}</p></div>` : ''}` +
  `${headers ? `<h5>Headers</h5><pre><code>${headers}</code></pre>` : ''}` +
  `${body ? `<h5>Body</h5><pre><code>${body}</code></pre>` : ''}` +
  `</div></div>`;

const parameters = (...rows: string[]) =>
  `<div class="title"><strong>URI Parameters</strong></div>` +
  `<div class="collapse-content"><dl class="inner">${rows.join('')}</dl></div>`;

const parameter = (
  name: string,
  type: string,
  requirement: 'required' | 'optional',
  example: string,
  description: string
) =>
  `<dt>${name}</dt><dd><code>${type}</code>&nbsp;<span class="${requirement}">(${requirement})</span>` +
  `&nbsp;<span class="text-muted example"><strong>Example:&nbsp;</strong><span>${example}</span></span>` +
  `<p>${description}</p></dd>`;

const action = (
  id: string,
  method: string,
  uri: string,
  name: string,
  description: string,
  ...sections: string[]
) =>
  `<div id="${id}" class="action ${method.toLowerCase()}">` +
  `<h4 class="action-heading"><div class="name">${name}</div>` +
  `<a class="method ${method.toLowerCase()}">${method}</a><code class="uri">${uri}</code></h4>` +
  `<p>${description}</p>${sections.join('')}</div>`;

// The page separates header lines with `<br>`.
const AUTH_HEADERS = 'Content-Type: application/json<br>Authorization: Bearer &lt;access_token&gt;';

const page = `<!DOCTYPE html><html><body>
${action(
  'indicators-indicator-list-get',
  'GET',
  '/indicators{?limit,offset,sort,with}',
  'Get List',
  'Get a list of Indicators.',
  parameters(
    parameter('limit', 'integer', 'optional', '500', 'The maximum number of records.'),
    parameter('offset', 'integer', 'optional', '100', 'The first record.'),
    parameter('sort', 'string', 'optional', 'id', 'Fields to sort by.'),
    parameter('with', 'string', 'optional', 'tags', 'Related objects to include.')
  ),
  block('Request', AUTH_HEADERS, ''),
  block(
    'Response&nbsp;&nbsp;200',
    'Content-Type: application/json',
    '{ "total": 2, "data": [ { "id": 1, "value": "a.example", "score": 1.5, "tags": ["x"] }, { "id": 2, "value": "b.example", "score": null, "parent": { "id": 1 } } ] }',
    'The list.'
  ),
  block('Response&nbsp;&nbsp;401', '', '')
)}
${action(
  'indicators-indicator-list-post',
  'POST',
  '/indicators',
  'Create New',
  'Create Indicators.',
  block(
    'Request',
    AUTH_HEADERS,
    '[ { "class": "network", "type_id": "10", "sources": [ { "name": "a" } ] } ]'
  ),
  block(
    'Response&nbsp;&nbsp;201',
    'Content-Type: application/json',
    '{ "total": 1, "data": [ { "id": 7 } ] }'
  ),
  block('Response&nbsp;&nbsp;400', 'Content-Type: application/json', '{ "data": { "errors": {} } }')
)}
${action(
  'plugins-plugin-execute-post',
  'POST',
  '/plugins/{plugin_id}/execute',
  'Plugin Execute',
  'Run a plugin.',
  parameters(parameter('plugin_id', 'integer', 'required', '1', 'Plugin ID')),
  block('Request', AUTH_HEADERS, '{ "type": "Indicator", "id": "1397" }'),
  block('Response&nbsp;&nbsp;201', 'Content-Type: application/json', '{ "data": {} }')
)}
${action(
  'indicators-indicator-get',
  'GET',
  '/indicators/{indicator_id}{?with}',
  'Get Single',
  'Get an Indicator.',
  block('Request', AUTH_HEADERS, ''),
  block('Response&nbsp;&nbsp;200', 'Content-Type: application/json', '{ "data": { "id": 1 } }')
)}
${action(
  'token-post',
  'POST',
  '/token',
  'Get token',
  'Authorize.',
  block(
    'Request',
    'Content-Type: application/json',
    '{ "email": "a@example.com", "password": "x" }'
  ),
  block('Response&nbsp;&nbsp;200', 'Content-Type: application/json', '{ "access_token": "abc" }')
)}
${action(
  'attachments-upload-post',
  'POST',
  '/attachments',
  'Upload',
  'Upload a file.',
  block(
    'Request',
    'Content-Type: multipart/form-data',
    '------WebKitFormBoundary Content-Disposition: form-data'
  ),
  block('Response&nbsp;&nbsp;200', '', 'No Response Body.')
)}
</body></html>`;

describe('convertAglioReference', () => {
  const document = convertAglioReference({ format: 'threatq-html', html: page, version: '6.16.0' });
  const paths = document.paths as Record<string, Record<string, any>>;

  it('knows the formats it converts', () => {
    expect(isAglioReferenceFormat('threatq-html')).toBe(true);
    expect(isAglioReferenceFormat('other')).toBe(false);
  });

  it('describes the document and the instance it is served from', () => {
    expect(document).toMatchObject({
      openapi: '3.0.3',
      info: { title: 'ThreatQ REST API', version: '6.16.0' },
      servers: [
        {
          url: 'https://{hostname}/api',
          variables: { hostname: { default: 'threatq.example.com' } },
        },
      ],
    });
  });

  it('takes the path without its query template, and the query parameters from the URI Parameters', () => {
    const { get } = paths['/indicators'];
    expect(get.operationId).toBe('indicators-indicator-list-get');
    expect(get.summary).toBe('Get List');
    expect(get.parameters).toEqual([
      {
        name: 'limit',
        in: 'query',
        required: false,
        description: 'The maximum number of records.',
        schema: { type: 'integer' },
        example: 500,
      },
      {
        name: 'offset',
        in: 'query',
        required: false,
        description: 'The first record.',
        schema: { type: 'integer' },
        example: 100,
      },
      {
        name: 'sort',
        in: 'query',
        required: false,
        description: 'Fields to sort by.',
        schema: { type: 'string' },
        example: 'id',
      },
      {
        name: 'with',
        in: 'query',
        required: false,
        description: 'Related objects to include.',
        schema: { type: 'string' },
        example: 'tags',
      },
    ]);
  });

  it('keeps query parameters the template names but the page does not describe, as strings', () => {
    expect(paths['/indicators/{indicator_id}'].get.parameters).toEqual([
      { name: 'indicator_id', in: 'path', required: true, schema: { type: 'string' } },
      { name: 'with', in: 'query', required: false, schema: { type: 'string' } },
    ]);
  });

  it('types path parameters from the page and requires them', () => {
    expect(paths['/plugins/{plugin_id}/execute'].post.parameters).toEqual([
      expect.objectContaining({
        name: 'plugin_id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        example: 1,
      }),
    ]);
  });

  it('infers response schemas from the example, with none of the properties required', () => {
    const { content, description } = paths['/indicators'].get.responses['200'];
    expect(description).toBe('The list.');
    expect(content['application/json'].schema).toEqual({
      type: 'object',
      properties: {
        total: { type: 'integer' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              value: { type: 'string' },
              score: { type: 'number', nullable: true },
              tags: { type: 'array', items: { type: 'string' } },
              parent: { type: 'object', properties: { id: { type: 'integer' } } },
            },
          },
        },
      },
    });
    expect(content['application/json'].schema).not.toHaveProperty('required');
    expect(content['application/json'].example.total).toBe(2);
  });

  it('keeps the statuses the page lists, with or without a body', () => {
    expect(Object.keys(paths['/indicators'].get.responses)).toEqual(['200', '401']);
    expect(paths['/indicators'].get.responses['401']).toEqual({ description: 'Response 401' });
  });

  it('reads the media type from the Content-Type header, not the lines after it', () => {
    expect(Object.keys(paths['/indicators'].post.requestBody.content)).toEqual([
      'application/json',
    ]);
  });

  it('describes a request body that is an array', () => {
    expect(paths['/indicators'].post.requestBody).toEqual({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                class: { type: 'string' },
                type_id: { type: 'string' },
                sources: {
                  type: 'array',
                  items: { type: 'object', properties: { name: { type: 'string' } } },
                },
              },
            },
          },
        },
      },
    });
  });

  it('requires a bearer token where the page sends one, and not to get a token', () => {
    expect(paths['/indicators'].get.security).toEqual([{ BearerAuth: [] }]);
    expect(paths['/token'].post.security).toBeUndefined();
    expect(document.components).toEqual({
      securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer' } },
    });
  });

  it('leaves out a request body it cannot read as JSON, and a response without one', () => {
    expect(paths['/attachments'].post.requestBody).toBeUndefined();
    expect(paths['/attachments'].post.responses['200'].content).toBeUndefined();
  });

  it('keeps the first action of a method and path', () => {
    const twice = convertAglioReference({
      format: 'threatq-html',
      html:
        action('first', 'GET', '/a', 'First', '') + action('second', 'GET', '/a{?x}', 'Second', ''),
    });
    expect((twice.paths as Record<string, any>)['/a'].get.operationId).toBe('first');
  });
});
