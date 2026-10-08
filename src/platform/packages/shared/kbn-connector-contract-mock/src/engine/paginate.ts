/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import { cloneDeep, get, unset } from 'lodash';
import type { ContractRequest, ContractResponse, Responder } from '../contract/types';
import { isRecord } from '../openapi/schema_walk';
import type { ContractOperation } from '../openapi/types';
import type { OperationRef } from './response_engine';
import { toOperationKey } from './response_engine';

/** How a cursor-paginated response says there are no more pages. */
export type PaginationEnd = 'empty_string' | 'null' | 'missing';

/** How a vendor operation pages, as declared in the connector's manifest. */
export type PaginationDescriptor =
  | {
      readonly style: 'cursor';
      readonly request: { readonly cursorParam: string; readonly sizeParam?: string };
      readonly response: {
        readonly itemsPath: string;
        readonly nextPath: string;
        /** A boolean field that is `true` while more pages follow, e.g. Stripe's `has_more`. */
        readonly hasMorePath?: string;
      };
      readonly end?: PaginationEnd;
      readonly defaultSize?: number;
    }
  | {
      readonly style: 'offset';
      readonly request: { readonly offsetParam: string; readonly sizeParam?: string };
      readonly response: { readonly itemsPath: string; readonly totalPath?: string };
      readonly defaultSize?: number;
    }
  | {
      readonly style: 'page';
      readonly request: {
        readonly pageParam: string;
        readonly sizeParam?: string;
        /** The number of the first page; defaults to 1. */
        readonly firstPage?: number;
      };
      readonly response: { readonly itemsPath: string; readonly totalPath?: string };
      readonly defaultSize?: number;
    };

export interface PaginatedOperation {
  readonly operation: OperationRef;
  readonly pagination: PaginationDescriptor;
}

export interface PaginationOptions {
  readonly pagination?: readonly PaginatedOperation[];
  /** The number of items in every paginated operation's virtual collection. */
  readonly collectionSize?: number;
}

const DEFAULT_COLLECTION_SIZE = 3;
const DEFAULT_PAGE_SIZE = 10;
const CURSOR_PREFIX = 'contract-mock:';

const encodeCursor = (position: number): string =>
  Buffer.from(`${CURSOR_PREFIX}${position}`).toString('base64url');

const decodeCursor = (cursor: string): number | undefined => {
  const decoded = Buffer.from(cursor, 'base64url').toString();
  const position = Number(decoded.slice(CURSOR_PREFIX.length));
  return decoded.startsWith(CURSOR_PREFIX) && Number.isInteger(position) && position >= 0
    ? position
    : undefined;
};

const readNumber = ({ query }: ContractRequest, name: string | undefined): number | undefined => {
  const value = name === undefined ? undefined : query[name];
  const number = typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(number) ? number : undefined;
};

// Copies of the template item, with distinct `id`s so handlers that dedupe or key by ID see
// every item.
const buildCollection = (template: unknown, size: number): unknown[] =>
  Array.from({ length: size }, (_, index) => {
    const item = cloneDeep(template);
    if (isRecord(item) && typeof item.id === 'number') {
      item.id = item.id + index;
    } else if (isRecord(item) && typeof item.id === 'string') {
      item.id = `${item.id}-${index + 1}`;
    }
    return item;
  });

const BAD_CURSOR: ContractResponse = {
  statusCode: 400,
  headers: { 'content-type': 'application/json' },
  body: { title: 'Bad Request', detail: 'The cursor was not issued by this API' },
};

const setEnd = (body: object, path: string, end: PaginationEnd = 'missing') => {
  if (end === 'missing') {
    unset(body, path);
  } else {
    set(body, path, end === 'null' ? null : '');
  }
};

const paginate = (
  { pagination, collectionSize }: { pagination: PaginationDescriptor; collectionSize: number },
  request: ContractRequest,
  response: ContractResponse
): ContractResponse => {
  const { body } = response;
  const template = isRecord(body) ? get(body, pagination.response.itemsPath) : undefined;
  if (!isRecord(body) || !Array.isArray(template) || template.length === 0) {
    return response;
  }
  const size =
    readNumber(request, pagination.request.sizeParam) ??
    pagination.defaultSize ??
    DEFAULT_PAGE_SIZE;
  let start = 0;
  if (pagination.style === 'cursor') {
    const cursor = request.query[pagination.request.cursorParam];
    const position = typeof cursor === 'string' && cursor !== '' ? decodeCursor(cursor) : 0;
    if (position === undefined) {
      return BAD_CURSOR;
    }
    start = position;
  } else if (pagination.style === 'offset') {
    start = readNumber(request, pagination.request.offsetParam) ?? 0;
  } else {
    const firstPage = pagination.request.firstPage ?? 1;
    start = ((readNumber(request, pagination.request.pageParam) ?? firstPage) - firstPage) * size;
  }

  const collection = buildCollection(template[0], collectionSize);
  const page = cloneDeep(body);
  set(page, pagination.response.itemsPath, collection.slice(start, start + size));
  const hasMore = start + size < collection.length;
  if (pagination.style === 'cursor') {
    const { nextPath, hasMorePath } = pagination.response;
    if (hasMore) {
      set(page, nextPath, encodeCursor(start + size));
    } else {
      setEnd(page, nextPath, pagination.end);
    }
    if (hasMorePath) {
      set(page, hasMorePath, hasMore);
    }
  } else if (pagination.response.totalPath) {
    set(page, pagination.response.totalPath, collection.length);
  }
  return { ...response, body: page };
};

/**
 * Wraps a responder so paginated operations serve pages of a virtual collection, built from
 * the first item of the response the responder would give. Pages are selected by the request's
 * cursor, offset or page number and page size; cursors are opaque positions, and cursors the
 * mock didn't issue get 400, as a vendor would answer.
 */
export const withPagination = (
  operations: readonly ContractOperation[],
  { pagination = [], collectionSize = DEFAULT_COLLECTION_SIZE }: PaginationOptions,
  respond: Responder
): Responder => {
  const byKey = new Map(pagination.map((entry) => [toOperationKey(entry.operation), entry]));
  const descriptors = new Map(
    operations.flatMap((operation) => {
      const entry = byKey.get(toOperationKey(operation));
      return entry ? [[operation, entry.pagination] as const] : [];
    })
  );
  return (operation, request) => {
    const response = respond(operation, request);
    const descriptor = descriptors.get(operation);
    return descriptor && response.statusCode < 300
      ? paginate({ pagination: descriptor, collectionSize }, request, response)
      : response;
  };
};
