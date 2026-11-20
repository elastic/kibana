/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import { cloneDeep, get, isEqual, maxBy, omit, toPath, unset } from 'lodash';
import type { ContractRequest, ContractResponse, Responder } from '../contract/types';
import { isRecord } from '../openapi/schema_walk';
import { MOCK_PAGE_PARAM } from '../openapi/read_parameters';
import type { ContractOperation } from '../openapi/types';
import type { RequestMatcher } from './request_match';
import { countConditions, matchesRequest } from './request_match';
import type {
  OperationRef,
  RecordedExchange,
  ResponseEngine,
  StoredResponse,
} from './response_engine';
import { createOperationIndex } from './response_engine';

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
 * lodash syntax; keys containing dots are quoted, e.g. `["@odata.nextLink"]`. An empty
 * `itemsPath` means the body is the collection itself, which leaves no room in it for a next
 * cursor, URL or total: such operations page by offset, page number, `Link` header or a cursor
 * in a header.
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
      /**
       * Omitted when the URL is opaque, as Azure's `nextLink` is: clients follow it as given, so
       * the mock selects the page with a query parameter of its own, `contract-mock-page`.
       */
      readonly request?: NextUrlRequest;
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
  /**
   * The number of items in every paginated operation's virtual collection. Defaults to the
   * number of recorded items, or 3 without recordings.
   */
  readonly collectionSize?: number;
}

interface RecordedCollection {
  readonly items: readonly unknown[];
  /** The position each recorded cursor points at. */
  readonly positions: ReadonlyMap<string, number>;
  /** The recorded cursor for each position, issued instead of the mock's own. */
  readonly cursors: ReadonlyMap<number, string>;
}

/** A recorded collection, and the requests it answers: its recordings' non-paging values. */
interface ScopedCollection {
  readonly scope: RequestMatcher;
  readonly recorded: RecordedCollection;
}

type RequestParameters = Pick<ContractRequest, 'query' | 'headers' | 'body'>;

const DEFAULT_COLLECTION_SIZE = 3;
const DEFAULT_PAGE_SIZE = 10;
const CURSOR_PREFIX = 'contract-mock:';
// Opaque next-page URLs carry the mock's own cursor.
const OPAQUE_REQUEST: CursorRequest = { cursorParam: MOCK_PAGE_PARAM };

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
  { query, headers, body }: RequestParameters,
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

const requestOf = (pagination: PaginationDescriptor): NextUrlRequest & Located =>
  pagination.request ?? OPAQUE_REQUEST;

// Next-page URLs carry their parameters in the query.
const parameterLocation = (pagination: PaginationDescriptor): PaginationParameterLocation =>
  pagination.style === 'link' || pagination.style === 'next_url'
    ? 'query'
    : requestOf(pagination).in ?? 'query';

const readPageSize = (
  pagination: PaginationDescriptor,
  read: (name: string) => unknown
): number => {
  const { sizeParam } = requestOf(pagination);
  return (
    (sizeParam === undefined ? undefined : toInteger(read(sizeParam))) ??
    pagination.defaultSize ??
    DEFAULT_PAGE_SIZE
  );
};

// The position of the first item the request asks for; undefined for a cursor that neither the
// mock issued nor a recording contains.
const readStart = (
  request: NextUrlRequest,
  read: (name: string) => unknown,
  size: number,
  recordedPositions?: ReadonlyMap<string, number>
): number | undefined => {
  if ('cursorParam' in request) {
    const cursor = read(request.cursorParam);
    if (cursor === undefined || cursor === '') {
      return 0;
    }
    return typeof cursor === 'string'
      ? recordedPositions?.get(cursor) ?? decodeCursor(cursor)
      : undefined;
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
  { start, size, cursor }: { start: number; size: number; cursor: string }
): string => {
  const next = new URL(url);
  if ('cursorParam' in request) {
    next.searchParams.set(request.cursorParam, cursor);
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

// Recorded items, cut to `size` or padded with copies of the last one.
const resize = (items: readonly unknown[], size: number | undefined): unknown[] =>
  size === undefined || size <= items.length
    ? items.slice(0, size)
    : [...items, ...buildCollection(items[items.length - 1], size - items.length + 1).slice(1)];

const LINK_NEXT = /<([^>]+)>[^,]*rel="?next"?/;

// The cursor a recorded response hands to the next request, wherever the vendor puts it.
const readRecordedNext = (
  pagination: PaginationDescriptor,
  { headers = {}, body }: StoredResponse
): unknown => {
  const header = (name: string) =>
    Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  let url: unknown;
  if (pagination.style === 'cursor') {
    const { in: nextIn = 'body', nextPath } = pagination.response;
    return nextIn === 'header'
      ? header(nextPath)
      : isRecord(body)
      ? get(body, nextPath)
      : undefined;
  } else if (pagination.style === 'link') {
    url = LINK_NEXT.exec(header('link') ?? '')?.[1];
  } else if (pagination.style === 'next_url') {
    url = isRecord(body) ? get(body, pagination.response.nextPath) : undefined;
  }
  const request = requestOf(pagination);
  if (typeof url !== 'string' || !('cursorParam' in request)) {
    return undefined;
  }
  try {
    return new URL(url).searchParams.get(request.cursorParam) ?? undefined;
  } catch {
    return undefined;
  }
};

interface RecordedPage {
  readonly items: readonly unknown[];
  /** The vendor cursor the page was requested with; its start comes from the page before. */
  readonly cursor?: string;
  readonly start?: number;
  readonly next: unknown;
}

const getItems = (body: unknown, itemsPath: string): unknown =>
  itemsPath === '' ? body : isRecord(body) ? get(body, itemsPath) : undefined;

const readRecordedPage = (
  pagination: PaginationDescriptor,
  { request = {}, response }: RecordedExchange
): RecordedPage[] => {
  const items = getItems(response.body, pagination.response.itemsPath);
  if (!Array.isArray(items)) {
    return [];
  }
  const parameters: RequestParameters = {
    query: request.query ?? {},
    headers: Object.fromEntries(
      Object.entries(request.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value])
    ),
    body: request.body,
  };
  const read = (name: string) => readParameter(parameters, parameterLocation(pagination), name);
  const pageRequest = requestOf(pagination);
  const cursor = 'cursorParam' in pageRequest ? read(pageRequest.cursorParam) : '';
  const next = readRecordedNext(pagination, response);
  return typeof cursor === 'string' && cursor !== ''
    ? [{ items, cursor, next }]
    : [{ items, start: readStart(pageRequest, read, readPageSize(pagination, read)), next }];
};

/**
 * Joins the recorded pages of an operation into one collection. A page requested with a vendor
 * cursor starts where the page that returned that cursor ended; pages whose start can't be
 * placed right after the pages before them are left out.
 */
const readRecordedCollection = (
  pagination: PaginationDescriptor,
  exchanges: readonly RecordedExchange[]
): RecordedCollection | undefined => {
  const pages = exchanges.flatMap((exchange) => readRecordedPage(pagination, exchange));
  const positions = new Map<string, number>();
  const starts = new Map<RecordedPage, number>();
  let placed = true;
  while (placed) {
    placed = false;
    for (const page of pages) {
      const start =
        page.start ?? (page.cursor === undefined ? undefined : positions.get(page.cursor));
      if (start !== undefined && !starts.has(page)) {
        starts.set(page, start);
        placed = true;
        if (typeof page.next === 'string' && page.next !== '' && !positions.has(page.next)) {
          positions.set(page.next, start + page.items.length);
        }
      }
    }
  }
  const items: unknown[] = [];
  [...starts]
    .sort(([, a], [, b]) => a - b)
    .forEach(([page, start]) => {
      if (start === items.length) {
        items.push(...page.items);
      }
    });
  if (items.length === 0) {
    return undefined;
  }
  const reachable = [...positions].filter(([, position]) => position <= items.length);
  return {
    items,
    positions: new Map(reachable),
    cursors: new Map(reachable.reverse().map(([cursor, position]) => [position, cursor])),
  };
};

const pagingParameters = (pagination: PaginationDescriptor): string[] => {
  const request = requestOf(pagination);
  const selector =
    'cursorParam' in request
      ? request.cursorParam
      : 'offsetParam' in request
      ? request.offsetParam
      : request.pageParam;
  return request.sizeParam === undefined ? [selector] : [selector, request.sizeParam];
};

// Removes a body parameter and the objects it leaves empty, so a body that only sends `page` for
// its `page.cursor` compares equal to one that doesn't send `page` at all.
const removeBodyParameter = (body: object, name: string) => {
  unset(body, name);
  const parents = toPath(name).slice(0, -1);
  for (let depth = parents.length; depth > 0; depth--) {
    const parent = parents.slice(0, depth);
    const value = get(body, parent);
    if (!isRecord(value) || Object.keys(value).length > 0) {
      return;
    }
    unset(body, parent);
  }
};

// What sets a recording's collection apart from the operation's others: its path parameters, and
// its query and body without the parameters that select a page.
const toRecordedScope = (
  pagination: PaginationDescriptor,
  { request: { pathParameters = {}, query = {}, body } = {} }: RecordedExchange
): RequestMatcher => {
  const names = pagingParameters(pagination);
  const location = parameterLocation(pagination);
  const scopedQuery = location === 'query' ? omit(query, names) : query;
  const scopedBody = location === 'body' && isRecord(body) ? cloneDeep(body) : body;
  if (location === 'body' && isRecord(scopedBody)) {
    names.forEach((name) => removeBodyParameter(scopedBody, name));
  }
  const hasBody =
    scopedBody !== undefined && !(isRecord(scopedBody) && Object.keys(scopedBody).length === 0);
  return {
    ...(Object.keys(pathParameters).length > 0 ? { path: pathParameters } : {}),
    ...(Object.keys(scopedQuery).length > 0 ? { query: scopedQuery } : {}),
    ...(hasBody ? { body: scopedBody } : {}),
  };
};

const readRecordedCollections = (
  pagination: PaginationDescriptor,
  exchanges: readonly RecordedExchange[]
): ScopedCollection[] => {
  const groups: Array<{ scope: RequestMatcher; exchanges: RecordedExchange[] }> = [];
  for (const exchange of exchanges) {
    const scope = toRecordedScope(pagination, exchange);
    const group = groups.find((candidate) => isEqual(candidate.scope, scope));
    if (group) {
      group.exchanges.push(exchange);
    } else {
      groups.push({ scope, exchanges: [exchange] });
    }
  }
  return groups.flatMap(({ scope, exchanges: own }) => {
    const recorded = readRecordedCollection(pagination, own);
    return recorded ? [{ scope, recorded }] : [];
  });
};

// The most specific collection whose scope the request meets, else the operation's first, as
// with the recording a request gets.
const selectCollection = (
  collections: readonly ScopedCollection[],
  request: ContractRequest
): RecordedCollection | undefined =>
  (
    maxBy(
      collections.filter(({ scope }) => matchesRequest(scope, request)),
      ({ scope }) => countConditions(scope)
    ) ?? collections[0]
  )?.recorded;

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
  {
    pagination,
    collectionSize,
    recorded,
  }: {
    pagination: PaginationDescriptor;
    collectionSize: number | undefined;
    recorded: RecordedCollection | undefined;
  },
  request: ContractRequest,
  response: ContractResponse
): ContractResponse => {
  const { body } = response;
  const { itemsPath } = pagination.response;
  const template = getItems(body, itemsPath);
  if (!Array.isArray(template) || (template.length === 0 && !recorded)) {
    return response;
  }
  const read = (name: string) => readParameter(request, parameterLocation(pagination), name);
  const size = readPageSize(pagination, read);
  const start = readStart(requestOf(pagination), read, size, recorded?.positions);
  if (start === undefined) {
    return BAD_CURSOR;
  }

  const collection = recorded
    ? resize(recorded.items, collectionSize)
    : buildCollection(template[0], collectionSize ?? DEFAULT_COLLECTION_SIZE);
  const items = collection.slice(start, start + size);
  const page: object =
    itemsPath === '' || !isRecord(body) ? items : set(cloneDeep(body), itemsPath, items);
  const inBody = !Array.isArray(page);
  const next = start + size < collection.length ? start + size : undefined;
  const cursor = next === undefined ? undefined : recorded?.cursors.get(next) ?? encodeCursor(next);
  const nextUrl =
    next === undefined || cursor === undefined
      ? undefined
      : toNextUrl(request, requestOf(pagination), { start: next, size, cursor });
  let { headers } = response;

  switch (pagination.style) {
    case 'cursor': {
      const { in: nextIn = 'body', nextPath, hasMorePath } = pagination.response;
      if (nextIn === 'body') {
        if (inBody) {
          setNext(page, nextPath, cursor, pagination.end);
        }
      } else {
        const atEnd = pagination.end === 'empty_string' ? '' : undefined;
        headers = withHeader(headers, nextPath, cursor ?? atEnd);
      }
      if (hasMorePath && inBody) {
        set(page, hasMorePath, next !== undefined);
      }
      break;
    }
    case 'link':
      headers = withHeader(headers, 'link', nextUrl && `<${nextUrl}>; rel="next"`);
      break;
    case 'next_url':
      if (inBody) {
        setNext(page, pagination.response.nextPath, nextUrl, pagination.end);
      }
      break;
    default:
      if (pagination.response.totalPath && inBody) {
        set(page, pagination.response.totalPath, collection.length);
      }
  }
  return { ...response, headers, body: page };
};

/**
 * Wraps a responder so paginated operations serve pages of a virtual collection: the pages
 * recorded for the request's non-paging values joined, or copies of the first item of the response
 * the responder would give. Fixtures are served as written. Pages are selected by the request's
 * cursor, offset or page number and page size, read from its query, body or headers; the next page
 * is signalled by a cursor, a `Link` header or a next-page URL in the body. Cursors are opaque
 * positions or recorded vendor cursors; others get 400, as a vendor would answer.
 */
export const withPagination = (
  operations: readonly ContractOperation[],
  {
    pagination = [],
    collectionSize,
    recordedExchanges = () => [],
    servedFrom = () => undefined,
  }: PaginationOptions & Partial<Pick<ResponseEngine, 'recordedExchanges' | 'servedFrom'>>,
  respond: Responder
): Responder => {
  const findOperations = createOperationIndex(operations);
  const paginated = new Map(
    pagination.flatMap((entry) =>
      findOperations(entry.operation).map(
        (operation) =>
          [
            operation,
            {
              pagination: entry.pagination,
              collections: readRecordedCollections(entry.pagination, recordedExchanges(operation)),
            },
          ] as const
      )
    )
  );
  return async (operation, request, context) => {
    const origin = servedFrom(operation, request);
    const response = await respond(operation, request, context);
    const entry = paginated.get(operation);
    if (
      !entry ||
      response.statusCode >= 300 ||
      origin === 'fixture' ||
      origin === 'runtime-fixture'
    ) {
      return response;
    }
    const { pagination: descriptor, collections } = entry;
    return paginate(
      {
        pagination: descriptor,
        collectionSize,
        recorded: selectCollection(collections, request),
      },
      request,
      response
    );
  };
};
