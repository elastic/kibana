/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject } from './json_pointer';
import { assessPagination } from './propose_pagination';

const json = (schema: JsonObject, headers?: JsonObject) => ({
  '200': {
    description: 'ok',
    ...(headers ? { headers } : {}),
    content: { 'application/json': { schema } },
  },
});

const query = (name: string, schema: JsonObject = { type: 'string' }) => ({
  name,
  in: 'query',
  schema,
});

const assess = (operation: JsonObject, components: JsonObject = {}, method = 'get') =>
  assessPagination(
    { openapi: '3.0.3', paths: { '/list': { [method]: operation } }, components },
    {
      method,
      path: '/list',
    }
  );

const proposalOf = (operation: JsonObject, components?: JsonObject, method?: string) => {
  const assessment = assess(operation, components, method);
  return assessment.listLike ? assessment.proposal : undefined;
};

describe('assessPagination', () => {
  it('reads x-speakeasy-pagination, converting JSONPath outputs', () => {
    expect(
      proposalOf({
        parameters: [query('cursor'), query('limit', { type: 'integer', default: 20 })],
        'x-speakeasy-pagination': {
          type: 'cursor',
          inputs: [
            { name: 'cursor', in: 'parameters', type: 'cursor' },
            { name: 'limit', in: 'parameters', type: 'limit' },
          ],
          outputs: { results: '$.data.items', nextCursor: "$['meta']['next.cursor']" },
        },
        responses: json({ type: 'object' }),
      })
    ).toEqual({
      basis: 'x-speakeasy-pagination',
      pagination: {
        style: 'cursor',
        request: { cursorParam: 'cursor', sizeParam: 'limit' },
        response: { itemsPath: 'data.items', nextPath: '["meta"]["next.cursor"]' },
        defaultSize: 20,
      },
    });
  });

  it('reads x-ms-pageable, where a null nextLinkName means a single page', () => {
    expect(
      proposalOf({
        parameters: [query('$skiptoken'), query('$top', { type: 'integer' })],
        'x-ms-pageable': { nextLinkName: '@odata.nextLink' },
        responses: json({ type: 'object' }),
      })
    ).toEqual({
      basis: 'x-ms-pageable',
      pagination: {
        style: 'next_url',
        request: { cursorParam: '$skiptoken', sizeParam: '$top' },
        response: { itemsPath: 'value', nextPath: '["@odata.nextLink"]' },
      },
    });
    expect(proposalOf({ 'x-ms-pageable': { nextLinkName: null } })?.pagination).toBe('none');
  });

  it('proposes body cursors, skipping next-page URLs under links', () => {
    const page = {
      type: 'object',
      properties: { cursor: { type: 'string' }, limit: { type: 'integer', default: 10 } },
    };
    expect(
      proposalOf(
        {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { page: { $ref: '#/components/schemas/Page' } },
                },
              },
            },
          },
          responses: json({
            type: 'object',
            properties: {
              data: { type: 'array', items: {} },
              links: { type: 'object', properties: { next: { type: 'string' } } },
              meta: {
                type: 'object',
                properties: { page: { type: 'object', properties: { after: { type: 'string' } } } },
              },
            },
          }),
        },
        { schemas: { Page: page } },
        'post'
      )?.pagination
    ).toEqual({
      style: 'cursor',
      request: { in: 'body', cursorParam: 'page.cursor', sizeParam: 'page.limit' },
      response: { itemsPath: 'data', nextPath: 'meta.page.after' },
      defaultSize: 10,
    });
  });

  it('proposes nullable cursors with has-more flags', () => {
    expect(
      proposalOf({
        parameters: [query('start_cursor')],
        responses: json({
          type: 'object',
          properties: {
            results: { type: 'array', items: {} },
            next_cursor: { type: 'string', nullable: true },
            has_more: { type: 'boolean' },
          },
        }),
      })?.pagination
    ).toEqual({
      style: 'cursor',
      request: { cursorParam: 'start_cursor' },
      response: { itemsPath: 'results', nextPath: 'next_cursor', hasMorePath: 'has_more' },
      end: 'null',
    });
  });

  it('proposes zero-based pages over bare arrays, and offsets with totals', () => {
    expect(
      proposalOf({
        parameters: [query('page', { type: 'integer', example: 0 }), query('page_size')],
        responses: json({ type: 'array', items: {} }),
      })?.pagination
    ).toEqual({
      style: 'page',
      request: { pageParam: 'page', firstPage: 0, sizeParam: 'page_size' },
      response: { itemsPath: '' },
    });
    expect(
      proposalOf({
        parameters: [query('offset'), query('limit')],
        responses: json({
          type: 'object',
          allOf: [{ properties: { total: { type: 'integer' } } }],
          properties: { items: { type: 'array', items: {} } },
        }),
      })?.pagination
    ).toEqual({
      style: 'offset',
      request: { offsetParam: 'offset', sizeParam: 'limit' },
      response: { itemsPath: 'items', totalPath: 'total' },
    });
  });

  it('proposes Link headers when the response declares one', () => {
    expect(
      proposalOf({
        parameters: [query('page'), query('per_page')],
        responses: json({ type: 'array', items: {} }, { Link: { schema: { type: 'string' } } }),
      })?.pagination
    ).toEqual({
      style: 'link',
      request: { pageParam: 'page', sizeParam: 'per_page' },
      response: { itemsPath: '' },
    });
  });

  it('flags collections it cannot propose pagination for', () => {
    expect(assess({ responses: json({ type: 'array', items: {} }) })).toEqual({
      listLike: true,
      reason: 'it returns an array',
    });
    expect(
      assess({
        parameters: [query('limit')],
        responses: json({ type: 'object', properties: { links: { type: 'array', items: {} } } }),
      })
    ).toEqual({ listLike: true, reason: 'it takes limit' });
  });

  it('does not flag single resources, or sizes without a collection', () => {
    expect(assess({ responses: json({ type: 'object', properties: { id: {} } }) })).toEqual({
      listLike: false,
    });
    expect(
      assess(
        {
          parameters: [query('limit')],
          responses: json({ type: 'object', properties: { id: {} } }),
        },
        {},
        'post'
      )
    ).toEqual({ listLike: false });
  });
});
