/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertMarkdownReference } from '.';

const PARAMETER_HEADER = [
  '| Name | Location | Type | Required | Constraints | Description |',
  '|------|----------|------|----------|-------------|-------------|',
];
const FIELD_HEADER = ['| Field | Type | Description |', '|-------|------|-------------|'];

// Excerpts of api-dashboard.search.brave.com/api-reference pages.
const webSearch = [
  '# Search',
  '',
  '`GET` `/v1/web/search`',
  '',
  'Search the web from a large independent index of web pages.',
  '',
  '**Base URL:** `https://api.search.brave.com/res`',
  '',
  '## Authorization',
  '',
  ...PARAMETER_HEADER,
  '| `x-subscription-token` | header | string | Yes |  | The subscription token. |',
  '',
  '## Query Parameters',
  '',
  ...PARAMETER_HEADER,
  "| `q` | query | string | Yes |  | The user's search query term. |",
  '| `country` | query | string | No | `AR`, `US`, `ALL`; default `US` | The 2 character country code. |',
  '| `count` | query | integer | No | `1`-`20`; default `20` | The number of search results. |',
  '| `spellcheck` | query | boolean | No | default `true` | Whether to spell check. |',
  '| `freshness` | query | string | No | default `` | Filters search results by page age. |',
  '',
  '## Headers',
  '',
  ...PARAMETER_HEADER,
  "| `x-loc-lat` | header | string | No | `-90`-`90` | The latitude of the client's location. |",
  '| `accept` | header | string | No | `application/json`, `*/*`; default `application/json` | The media type. |',
  '',
  '## Responses',
  '',
  '### 200',
  'Successful Response',
  '',
  ...FIELD_HEADER,
  '| `type` | string? |  |',
  '| `query` | object? | Search query string and its modifications. |',
  '| `query.original` | string | The original query that was requested. |',
  '| `query.language.main` | string | The main language seen in the string. |',
  '| `web` | object? | Web search results. |',
  '| `web.results` | object[] | A list of web search results. |',
  '| `web.results[].url` | string | The URL where the page is served. |',
  '| `web.results[].extra_snippets` | string[]? | Extra snippets \\| alternates. |',
  '| `web.results[].icons` | object[]? | Icons. |',
  '| `web.results[].icons[].href` | string |  |',
  '',
  '### 429',
  'Too Many Requests',
  '',
  ...FIELD_HEADER,
  '| `error` | object |  |',
  '| `error.code` | string | An application-specific error code. |',
  '',
  '## Code Samples',
  '',
  '### cURL',
  '',
  '```bash',
  'curl "https://api.search.brave.com/res/v1/web/search?q=brave+search"',
  '```',
].join('\n');

const answers = [
  '# Answers',
  '',
  '`POST` `/v1/chat/completions`',
  '',
  '**Base URL:** `https://api.search.brave.com/res`',
  '',
  '## Request Body',
  '**Required**',
  '',
  '| Field | Type | Constraints | Description |',
  '|-------|------|-------------|-------------|',
  '| `messages` | object[] |  | The conversation so far. |',
  '| `messages[].role` | string? | `user`; default `user` |  |',
  '| `messages[].content` | string |  |  |',
  '| `research_maximum_number_of_queries` | int? | `1`-`50`; default `20` |  |',
  '',
  '## Responses',
  '',
  '### 200',
  'Successful Response',
  '',
  ...FIELD_HEADER,
  '| `id` | string |  |',
].join('\n');

const guide = ['# Quickstart', '', 'Get started with the Brave Search API in minutes.'].join('\n');

const convert = () =>
  convertMarkdownReference({
    format: 'brave-markdown',
    pages: [
      {
        url: 'https://api-dashboard.search.brave.com/api-reference/web/search/get/index.html.md',
        markdown: webSearch,
      },
      {
        url: 'https://api-dashboard.search.brave.com/api-reference/ai/answers/index.html.md',
        markdown: answers,
      },
      {
        url: 'https://api-dashboard.search.brave.com/documentation/quickstart/index.html.md',
        markdown: guide,
      },
    ],
  });

type Paths = Record<string, Record<string, Record<string, unknown>>>;

describe('convertMarkdownReference: brave-markdown', () => {
  it('serves endpoints from their base URL, with the authorization table as security', () => {
    const document = convert();

    expect(document.servers).toEqual([{ url: 'https://api.search.brave.com/res' }]);
    expect(Object.keys(document.paths as object)).toEqual([
      '/v1/web/search',
      '/v1/chat/completions',
    ]);
    expect((document.paths as Paths)['/v1/web/search'].get.security).toEqual([
      { 'x-subscription-token': [] },
    ]);
    expect(document.components).toMatchObject({
      securitySchemes: {
        'x-subscription-token': { type: 'apiKey', in: 'header', name: 'x-subscription-token' },
      },
    });
  });

  it('reads parameter tables with enums, ranges and defaults, ignoring the Accept header', () => {
    const { parameters } = (convert().paths as Paths)['/v1/web/search'].get;

    expect(parameters).toEqual([
      {
        name: 'q',
        in: 'query',
        required: true,
        description: "The user's search query term.",
        schema: { type: 'string' },
      },
      {
        name: 'country',
        in: 'query',
        required: false,
        description: 'The 2 character country code.',
        schema: { type: 'string', enum: ['AR', 'US', 'ALL'], default: 'US' },
      },
      {
        name: 'count',
        in: 'query',
        required: false,
        description: 'The number of search results.',
        schema: { type: 'integer', minimum: 1, maximum: 20, default: 20 },
      },
      {
        name: 'spellcheck',
        in: 'query',
        required: false,
        description: 'Whether to spell check.',
        schema: { type: 'boolean', default: true },
      },
      {
        name: 'freshness',
        in: 'query',
        required: false,
        description: 'Filters search results by page age.',
        schema: { type: 'string', default: '' },
      },
      {
        name: 'x-loc-lat',
        in: 'header',
        required: false,
        description: "The latitude of the client's location.",
        schema: { type: 'string' },
      },
    ]);
  });

  it('nests flat response fields by their dotted names, per status', () => {
    const { responses } = (convert().paths as Paths)['/v1/web/search'].get;

    expect(responses).toEqual({
      '200': {
        description: 'Successful Response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                type: { type: 'string', nullable: true },
                query: {
                  type: 'object',
                  nullable: true,
                  description: 'Search query string and its modifications.',
                  required: ['original'],
                  properties: {
                    original: {
                      type: 'string',
                      description: 'The original query that was requested.',
                    },
                    // `query.language` isn't listed, so it is an optional object.
                    language: {
                      type: 'object',
                      required: ['main'],
                      properties: {
                        main: {
                          type: 'string',
                          description: 'The main language seen in the string.',
                        },
                      },
                    },
                  },
                },
                web: {
                  type: 'object',
                  nullable: true,
                  description: 'Web search results.',
                  required: ['results'],
                  properties: {
                    results: {
                      type: 'array',
                      description: 'A list of web search results.',
                      items: {
                        type: 'object',
                        required: ['url'],
                        properties: {
                          url: { type: 'string', description: 'The URL where the page is served.' },
                          extra_snippets: {
                            type: 'array',
                            items: { type: 'string' },
                            nullable: true,
                            description: 'Extra snippets | alternates.',
                          },
                          icons: {
                            type: 'array',
                            nullable: true,
                            description: 'Icons.',
                            items: {
                              type: 'object',
                              required: ['href'],
                              properties: { href: { type: 'string' } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '429': {
        description: 'Too Many Requests',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['error'],
              properties: {
                error: {
                  type: 'object',
                  required: ['code'],
                  properties: {
                    code: { type: 'string', description: 'An application-specific error code.' },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it('reads the request body table and whether the body is required', () => {
    const { requestBody } = (convert().paths as Paths)['/v1/chat/completions'].post;

    expect(requestBody).toEqual({
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['messages'],
            properties: {
              messages: {
                type: 'array',
                description: 'The conversation so far.',
                items: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    role: { type: 'string', enum: ['user'], nullable: true, default: 'user' },
                    content: { type: 'string' },
                  },
                },
              },
              research_maximum_number_of_queries: {
                type: 'integer',
                minimum: 1,
                maximum: 50,
                nullable: true,
                default: 20,
              },
            },
          },
        },
      },
    });
  });
});
