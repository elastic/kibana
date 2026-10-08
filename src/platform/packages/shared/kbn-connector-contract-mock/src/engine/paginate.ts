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

/** Where a request carries its pagination parameters; body parameters are paths into it. */
export type PaginationParameterLocation = 'query' | 'body' | 'header';

export interface CursorRequest {
  readonly cursorParam: string;
  readonly sizeParam?: string;
}

export interface OffsetRequest {
  readonly offsetParam: string;
  readonly sizeParam?: string;
}

export interface PageNumberRequest {
  readonly pageParam: string;
  readonly sizeParam?: string;
  /** The number of the first page; defaults to 1. */
  readonly firstPage?: number;
}

/** The query parameter a next-page URL sets to select the page. */
export type NextUrlRequest = CursorRequest | OffsetRequest | PageNumberRequest;

interface Located {
  /** Defaults to `query`. */
  readonly in?: PaginationParameterLocation;
}

/**
 * How a vendor operation pages, as declared in the connector's manifest. Paths into bodies use
 * lodash syntax; keys containing dots are quoted, e.g. `["@odata.nextLink"]`.
 */
export type PaginationDescriptor =
  | {
      readonly style: 'cursor';
      readonly request: CursorRequest & Located;
      readonly response: {
        /** Where the next cursor goes; with `header`, `nextPath` is a header name. */
        readonly in?: 'body' | 'header';
        readonly itemsPath: string;
        readonly nextPath: string;
        /** A boolean body field that is `true` while more pages follow, e.g. Stripe's `has_more`. */
        readonly hasMorePath?: string;
      };
      readonly end?: PaginationEnd;
      readonly defaultSize?: number;
    }
  | {
      readonly style: 'offset';
      readonly request: OffsetRequest & Located;
      readonly response: { readonly itemsPath: string; readonly totalPath?: string };
      readonly defaultSize?: number;
    }
  | {
      readonly style: 'page';
      readonly request: PageNumberRequest & Located;
      readonly response: { readonly itemsPath: string; readonly totalPath?: string };
      readonly defaultSize?: number;
    }
  | {
      /** The next page's URL is in a `Link: <url>; rel="next"` header, as on GitHub. */
      readonly style: 'link';
      readonly request: NextUrlRequest;
      readonly response: { readonly itemsPath: string };
      readonly defaultSize?: number;
    }
  | {
      /** The next page's URL is in the body, e.g. Microsoft Graph's `@odata.nextLink`. */
      readonly style: 'next_url';
      readonly request: NextUrlRequest;
      readonly response: { readonly itemsPath: string; readonly nextPath: string };
      readonly end?: 'null' | 'missing';
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

const readParameter = (
  { query, headers, body }: ContractRequest,
  location: PaginationParameterLocation,
  name: string
): unknown => {
  if (location === 'body') {
    return isRecord(body) ? get(body, name) : undefined;
  }
  return location === 'header' ? headers[name.toLowerCase()] : query[name];
};

const toInteger = (value: unknown): number | undefined => {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value !== ''
      ? Number(value)
      : NaN;
  return Number.isInteger(number) ? number : undefined;
};

// The position of the first item the request asks for; undefined for a cursor the mock didn't
// issue.
const readStart = (
  request: NextUrlRequest,
  read: (name: string) => unknown,
  size: number
): number | undefined => {
  if ('cursorParam' in request) {
    const cursor = read(request.cursorParam);
    if (cursor === undefined || cursor === '') {
      return 0;
    }
    return typeof cursor === 'string' ? decodeCursor(cursor) : undefined;
  }
  if ('offsetParam' in request) {
    return Math.max(0, toInteger(read(request.offsetParam)) ?? 0);
  }
  const firstPage = request.firstPage ?? 1;
  return Math.max(0, ((toInteger(read(request.pageParam)) ?? firstPage) - firstPage) * size);
};

// The request's URL with its page parameter set to ask for the page starting at `start`.
const toNextUrl = (
  { url }: ContractRequest,
  request: NextUrlRequest,
  start: number,
  size: number
): string => {
  const next = new URL(url);
  if ('cursorParam' in request) {
    next.searchParams.set(request.cursorParam, encodeCursor(start));
  } else if ('offsetParam' in request) {
    next.searchParams.set(request.offsetParam, String(start));
  } else {
    next.searchParams.set(request.pageParam, String(start / size + (request.firstPage ?? 1)));
  }
  return next.toString();
};

const withoutHeader = (
  headers: Readonly<Record<string, string>> = {},
  name: string
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).filter(([key]) => key.toLowerCase() !== name.toLowerCase())
  );

const withHeader = (
  headers: Readonly<Record<string, string>> | undefined,
  name: string,
  value: string | undefined
): Record<string, string> =>
  value === undefined
    ? withoutHeader(headers, name)
    : { ...withoutHeader(headers, name), [name.toLowerCase()]: value };

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

// Writes the next-page value at `path`, or the vendor's end signal when there is none.
const setNext = (
  body: object,
  path: string,
  next: string | undefined,
  end: PaginationEnd = 'missing'
) => {
  if (next !== undefined) {
    set(body, path, next);
  } else if (end === 'missing') {
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
  // Next-page URLs carry their parameters in the query.
  const location =
    pagination.style === 'link' || pagination.style === 'next_url'
      ? 'query'
      : pagination.request.in ?? 'query';
  const read = (name: string) => readParameter(request, location, name);
  const { sizeParam } = pagination.request;
  const size =
    (sizeParam === undefined ? undefined : toInteger(read(sizeParam))) ??
    pagination.defaultSize ??
    DEFAULT_PAGE_SIZE;
  const start = readStart(pagination.request, read, size);
  if (start === undefined) {
    return BAD_CURSOR;
  }

  const collection = buildCollection(template[0], collectionSize);
  const page = cloneDeep(body);
  set(page, pagination.response.itemsPath, collection.slice(start, start + size));
  const next = start + size < collection.length ? start + size : undefined;
  const nextUrl =
    next === undefined ? undefined : toNextUrl(request, pagination.request, next, size);
  let { headers } = response;

  switch (pagination.style) {
    case 'cursor': {
      const { in: nextIn = 'body', nextPath, hasMorePath } = pagination.response;
      const cursor = next === undefined ? undefined : encodeCursor(next);
      if (nextIn === 'body') {
        setNext(page, nextPath, cursor, pagination.end);
      } else {
        const atEnd = pagination.end === 'empty_string' ? '' : undefined;
        headers = withHeader(headers, nextPath, cursor ?? atEnd);
      }
      if (hasMorePath) {
        set(page, hasMorePath, next !== undefined);
      }
      break;
    }
    case 'link':
      headers = withHeader(headers, 'link', nextUrl && `<${nextUrl}>; rel="next"`);
      break;
    case 'next_url':
      setNext(page, pagination.response.nextPath, nextUrl, pagination.end);
      break;
    default:
      if (pagination.response.totalPath) {
        set(page, pagination.response.totalPath, collection.length);
      }
  }
  return { ...response, headers, body: page };
};

/**
 * Wraps a responder so paginated operations serve pages of a virtual collection, built from
 * the first item of the response the responder would give. Pages are selected by the request's
 * cursor, offset or page number and page size, read from its query, body or headers; the next
 * page is signalled by a cursor, a `Link` header or a next-page URL in the body. Cursors are
 * opaque positions, and cursors the mock didn't issue get 400, as a vendor would answer.
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
