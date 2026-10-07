/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject } from './json_pointer';
import { getAtTokens, isJsonObject, localRefToPointer, toTokens } from './json_pointer';
import type { ManifestPagination } from './manifest';

export interface PaginationProposal {
  readonly pagination: ManifestPagination;
  /** What the proposal is based on, for the reviewer. */
  readonly basis: string;
}

export type PaginationAssessment =
  | { readonly listLike: false }
  | {
      readonly listLike: true;
      /** Why the operation looks like it returns a collection. */
      readonly reason: string;
      readonly proposal?: PaginationProposal;
    };

type Location = 'query' | 'header' | 'body';

interface Parameter {
  /** For body parameters, a lodash path into the body. */
  readonly name: string;
  readonly in: Location;
  readonly schema: JsonObject;
}

type Role = 'cursor' | 'offset' | 'page' | 'size';

const ROLES: Readonly<Record<Role, readonly string[]>> = {
  cursor: [
    'cursor',
    'pagecursor',
    'pagetoken',
    'nextpagetoken',
    'nexttoken',
    'continuationtoken',
    'continuation',
    'after',
    'startingafter',
    'startcursor',
    'skiptoken',
    'searchafter',
    'marker',
  ],
  offset: ['offset', 'pageoffset', 'skip', 'startindex', 'startat'],
  page: ['page', 'pagenumber', 'pageindex', 'pagenum', 'pageno'],
  size: ['limit', 'pagelimit', 'pagesize', 'perpage', 'size', 'maxresults', 'max', 'top'],
};

const ITEMS = ['data', 'items', 'results', 'value', 'records', 'entries', 'list', 'hits'];
const NEXT_CURSOR = ['nextcursor', 'nextpagetoken', 'nexttoken', 'nextpagecursor', 'after', 'next'];
const NEXT_URL = ['nextlink', 'nexturl', 'odatanextlink', 'nextpageurl'];
const HAS_MORE = ['hasmore', 'hasnextpage', 'more'];
const TOTAL = ['total', 'totalcount', 'totalresults', 'totalitems', 'totalsize'];

const MAX_REF_DEPTH = 32;
const MAX_PROPERTY_DEPTH = 3;

const normalize = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '');

const lastSegment = (name: string): string => name.split('.').pop() ?? name;

const roleOf = ({ name }: Parameter): Role | undefined =>
  (Object.keys(ROLES) as Role[]).find((role) => ROLES[role].includes(normalize(lastSegment(name))));

const toLodashKey = (key: string): string =>
  /^[A-Za-z_$][\w$]*$/.test(key) ? key : `[${JSON.stringify(key)}]`;

const joinPath = (parent: string, key: string): string => {
  const segment = toLodashKey(key);
  return parent === '' || segment.startsWith('[') ? `${parent}${segment}` : `${parent}.${segment}`;
};

/** Converts a simple JSONPath such as `$.data.items` or `$['@odata.nextLink']` to lodash. */
const fromJsonPath = (jsonPath: string): string =>
  jsonPath
    .replace(/^\$\.?/, '')
    .replace(/\['([^']*)'\]/g, (_, key: string) => `[${JSON.stringify(key)}]`);

const resolve = (document: JsonObject, value: unknown, depth = 0): unknown => {
  if (!isJsonObject(value) || typeof value.$ref !== 'string' || depth > MAX_REF_DEPTH) {
    return value;
  }
  const pointer = localRefToPointer(value.$ref);
  return pointer === undefined
    ? value
    : resolve(document, getAtTokens(document, toTokens(pointer)), depth + 1);
};

const resolveObject = (document: JsonObject, value: unknown): JsonObject => {
  const resolved = resolve(document, value);
  return isJsonObject(resolved) ? resolved : {};
};

/** A schema's properties, including those of its `allOf` members. */
const propertiesOf = (document: JsonObject, schema: JsonObject, depth = 0): JsonObject => {
  const own = isJsonObject(schema.properties) ? schema.properties : {};
  if (!Array.isArray(schema.allOf) || depth > MAX_REF_DEPTH) {
    return own;
  }
  return schema.allOf.reduce<JsonObject>(
    (merged, member) => ({
      ...merged,
      ...propertiesOf(document, resolveObject(document, member), depth + 1),
    }),
    own
  );
};

const isArraySchema = (schema: JsonObject): boolean =>
  schema.type === 'array' || (Array.isArray(schema.type) && schema.type.includes('array'));

const isNullable = (schema: JsonObject): boolean =>
  schema.nullable === true || (Array.isArray(schema.type) && schema.type.includes('null'));

interface Field {
  readonly path: string;
  readonly key: string;
  readonly parentKey: string;
  readonly schema: JsonObject;
}

/** Every property up to `MAX_PROPERTY_DEPTH` levels deep, breadth first. */
const fieldsOf = (document: JsonObject, schema: JsonObject): Field[] => {
  const fields: Field[] = [];
  let level: Field[] = [{ path: '', key: '', parentKey: '', schema }];
  for (let depth = 0; depth < MAX_PROPERTY_DEPTH; depth++) {
    level = level.flatMap((parent) =>
      Object.entries(propertiesOf(document, parent.schema)).map(([key, child]) => ({
        path: joinPath(parent.path, key),
        key,
        parentKey: parent.key,
        schema: resolveObject(document, child),
      }))
    );
    fields.push(...level);
  }
  return fields;
};

/** The first field named like the earliest of `names`, so they go in order of preference. */
const findField = (fields: readonly Field[], names: readonly string[]): Field | undefined =>
  names
    .map((name) => fields.find(({ key }) => normalize(key) === name))
    .find((field) => field !== undefined);

/** URLs by format, or by sitting in a `links` object as in JSON:API. */
const isUrlField = ({ schema, parentKey }: Field): boolean =>
  schema.format === 'uri' || normalize(parentKey) === 'links';

const jsonSchemaOf = (document: JsonObject, content: unknown): JsonObject | undefined => {
  if (!isJsonObject(content)) {
    return undefined;
  }
  const type =
    Object.keys(content).find((mediaType) => /json/i.test(mediaType)) ??
    Object.keys(content).find((mediaType) => mediaType === 'application/x-www-form-urlencoded');
  const media = type ? resolveObject(document, content[type]) : undefined;
  return media && isJsonObject(media.schema) ? resolveObject(document, media.schema) : undefined;
};

const parametersOf = (document: JsonObject, pathItem: JsonObject, operation: JsonObject) => {
  const declared = [pathItem.parameters, operation.parameters]
    .flatMap((list) => (Array.isArray(list) ? list : []))
    .map((parameter) => resolveObject(document, parameter))
    .filter(
      (parameter): parameter is JsonObject & { name: string; in: 'query' | 'header' } =>
        typeof parameter.name === 'string' &&
        (parameter.in === 'query' || parameter.in === 'header')
    )
    .map(({ name, in: location, schema }) => ({
      name,
      in: location,
      schema: resolveObject(document, schema),
    }));
  const body = jsonSchemaOf(document, resolveObject(document, operation.requestBody).content);
  const bodyFields = body
    ? fieldsOf(document, body)
        .filter(({ schema }) => !isJsonObject(schema.properties))
        .map(({ path, schema }) => ({ name: path, in: 'body' as const, schema }))
    : [];
  return [...declared, ...bodyFields];
};

interface SuccessResponse {
  readonly schema?: JsonObject;
  readonly linkHeader: boolean;
}

const successResponseOf = (document: JsonObject, operation: JsonObject): SuccessResponse => {
  const responses = isJsonObject(operation.responses) ? operation.responses : {};
  const status = Object.keys(responses).find((code) => /^2/.test(code));
  if (!status) {
    return { linkHeader: false };
  }
  const response = resolveObject(document, responses[status]);
  const headers = isJsonObject(response.headers) ? Object.keys(response.headers) : [];
  return {
    schema: jsonSchemaOf(document, response.content),
    linkHeader: headers.some((header) => header.toLowerCase() === 'link'),
  };
};

/** The lodash path of the response's collection: `''` for a bare array. */
const itemsPathOf = (document: JsonObject, schema: JsonObject | undefined): string | undefined => {
  if (!schema) {
    return undefined;
  }
  if (isArraySchema(schema)) {
    return '';
  }
  const arrays = fieldsOf(document, schema).filter((field) => isArraySchema(field.schema));
  const shallow = arrays.filter(({ path }) => !path.includes('.') && !path.includes('['));
  const candidates = shallow.length > 0 ? shallow : arrays;
  if (candidates.length === 1) {
    return candidates[0].path;
  }
  return findField(candidates, ITEMS)?.path;
};

const withSize = <Request extends object>(
  request: Request,
  location: Location,
  size: Parameter | undefined
): Request & { sizeParam?: string } =>
  size && size.in === location ? { ...request, sizeParam: size.name } : request;

const withLocation = <Request extends object>(request: Request, location: Location) =>
  location === 'query' ? request : { ...request, in: location };

const defaultSizeOf = (size: Parameter | undefined): { defaultSize?: number } =>
  typeof size?.schema.default === 'number' && size.schema.default > 0
    ? { defaultSize: size.schema.default }
    : {};

const firstPageOf = ({ schema }: Parameter): { firstPage?: number } =>
  [schema.default, schema.minimum, schema.example].includes(0) ? { firstPage: 0 } : {};

const byRole = (parameters: readonly Parameter[]): Partial<Record<Role, Parameter>> =>
  Object.fromEntries(
    parameters.flatMap((parameter) => {
      const role = roleOf(parameter);
      return role ? [[role, parameter]] : [];
    })
  );

/** A query parameter selecting the page, for styles whose next page is a URL. */
const nextUrlRequestOf = (roles: Partial<Record<Role, Parameter>>) => {
  const { cursor, offset, page, size } = roles;
  if (cursor?.in === 'query') {
    return withSize({ cursorParam: cursor.name }, 'query', size);
  }
  if (offset?.in === 'query') {
    return withSize({ offsetParam: offset.name }, 'query', size);
  }
  if (page?.in === 'query') {
    return withSize({ pageParam: page.name, ...firstPageOf(page) }, 'query', size);
  }
  return undefined;
};

const fromSpeakeasy = (
  extension: JsonObject,
  parameters: readonly Parameter[],
  fallbackItemsPath: string | undefined
): ManifestPagination | undefined => {
  const outputs = isJsonObject(extension.outputs) ? extension.outputs : {};
  const inputs = (Array.isArray(extension.inputs) ? extension.inputs : []).filter(isJsonObject);
  const inputOf = (type: string): Parameter | undefined => {
    const input = inputs.find((candidate) => candidate.type === type);
    if (typeof input?.name !== 'string') {
      return undefined;
    }
    const declared = parameters.find(({ name }) => name === input.name);
    const location: Location =
      input.in === 'requestBody' ? 'body' : declared?.in === 'header' ? 'header' : 'query';
    return { name: input.name, in: location, schema: declared?.schema ?? {} };
  };
  const itemsPath =
    typeof outputs.results === 'string' ? fromJsonPath(outputs.results) : fallbackItemsPath;
  if (itemsPath === undefined) {
    return undefined;
  }
  const size = inputOf('limit');
  const cursor = inputOf('cursor');
  const offset = inputOf('offset');
  const page = inputOf('page');
  if (extension.type === 'cursor' && cursor && typeof outputs.nextCursor === 'string') {
    return {
      style: 'cursor',
      request: withLocation(withSize({ cursorParam: cursor.name }, cursor.in, size), cursor.in),
      response: { itemsPath, nextPath: fromJsonPath(outputs.nextCursor) },
      ...defaultSizeOf(size),
    };
  }
  if (extension.type === 'offsetLimit' && offset) {
    return {
      style: 'offset',
      request: withLocation(withSize({ offsetParam: offset.name }, offset.in, size), offset.in),
      response: { itemsPath },
      ...defaultSizeOf(size),
    };
  }
  if (extension.type === 'offsetLimit' && page) {
    return {
      style: 'page',
      request: withLocation(
        withSize({ pageParam: page.name, ...firstPageOf(page) }, page.in, size),
        page.in
      ),
      response: { itemsPath },
      ...defaultSizeOf(size),
    };
  }
  const request = nextUrlRequestOf(byRole(parameters));
  if (extension.type === 'url' && typeof outputs.nextUrl === 'string' && request) {
    return {
      style: 'next_url',
      request,
      response: { itemsPath, nextPath: fromJsonPath(outputs.nextUrl) },
    };
  }
  return undefined;
};

const fromMsPageable = (
  extension: JsonObject,
  parameters: readonly Parameter[]
): ManifestPagination | undefined => {
  if (extension.nextLinkName === null) {
    return 'none';
  }
  if (typeof extension.nextLinkName !== 'string') {
    return undefined;
  }
  // Azure's next links are opaque: clients follow them without knowing the parameter in them.
  const request = nextUrlRequestOf(byRole(parameters));
  const itemName = typeof extension.itemName === 'string' ? extension.itemName : 'value';
  return {
    style: 'next_url',
    ...(request ? { request } : {}),
    response: {
      itemsPath: joinPath('', itemName),
      nextPath: joinPath('', extension.nextLinkName),
    },
  };
};

const fromNames = (
  document: JsonObject,
  roles: Partial<Record<Role, Parameter>>,
  { schema, linkHeader }: SuccessResponse,
  itemsPath: string | undefined
): ManifestPagination | undefined => {
  if (itemsPath === undefined) {
    return undefined;
  }
  const { cursor, offset, page, size } = roles;
  const fields = schema && itemsPath !== '' ? fieldsOf(document, schema) : [];
  if (linkHeader) {
    const request = nextUrlRequestOf(roles);
    return request
      ? { style: 'link', request, response: { itemsPath }, ...defaultSizeOf(size) }
      : undefined;
  }
  if (cursor) {
    const urls = fields.filter(isUrlField);
    const next = findField(
      fields.filter((field) => !isUrlField(field)),
      NEXT_CURSOR
    );
    const nextUrl = findField(fields, NEXT_URL) ?? findField(urls, NEXT_CURSOR);
    const hasMore = findField(fields, HAS_MORE);
    const request = nextUrlRequestOf(roles);
    if (next) {
      return {
        style: 'cursor',
        request: withLocation(withSize({ cursorParam: cursor.name }, cursor.in, size), cursor.in),
        response: {
          itemsPath,
          nextPath: next.path,
          ...(hasMore ? { hasMorePath: hasMore.path } : {}),
        },
        ...(isNullable(next.schema) ? { end: 'null' as const } : {}),
        ...defaultSizeOf(size),
      };
    }
    return nextUrl && request
      ? {
          style: 'next_url',
          request,
          response: { itemsPath, nextPath: nextUrl.path },
          ...defaultSizeOf(size),
        }
      : undefined;
  }
  const total = findField(fields, TOTAL);
  const response = { itemsPath, ...(total ? { totalPath: total.path } : {}) };
  if (offset) {
    return {
      style: 'offset',
      request: withLocation(withSize({ offsetParam: offset.name }, offset.in, size), offset.in),
      response,
      ...defaultSizeOf(size),
    };
  }
  if (page) {
    return {
      style: 'page',
      request: withLocation(
        withSize({ pageParam: page.name, ...firstPageOf(page) }, page.in, size),
        page.in
      ),
      response,
      ...defaultSizeOf(size),
    };
  }
  return undefined;
};

/**
 * Whether an operation returns a collection, and how it pages if the spec says so: from
 * `x-speakeasy-pagination` or `x-ms-pageable`, otherwise from parameter and field names.
 */
export const assessPagination = (
  document: JsonObject,
  { method, path }: { readonly method: string; readonly path: string }
): PaginationAssessment => {
  const pathItem = resolveObject(document, getAtTokens(document, ['paths', path]));
  const operation = resolveObject(document, pathItem[method]);
  const parameters = parametersOf(document, pathItem, operation);
  const response = successResponseOf(document, operation);
  const itemsPath = itemsPathOf(document, response.schema);

  const speakeasy = operation['x-speakeasy-pagination'];
  if (isJsonObject(speakeasy)) {
    const pagination = fromSpeakeasy(speakeasy, parameters, itemsPath);
    return {
      listLike: true,
      reason: 'it has x-speakeasy-pagination',
      ...(pagination ? { proposal: { pagination, basis: 'x-speakeasy-pagination' } } : {}),
    };
  }
  const msPageable = operation['x-ms-pageable'];
  if (isJsonObject(msPageable)) {
    const pagination = fromMsPageable(msPageable, parameters);
    return {
      listLike: true,
      reason: 'it has x-ms-pageable',
      ...(pagination ? { proposal: { pagination, basis: 'x-ms-pageable' } } : {}),
    };
  }

  const roles = byRole(parameters);
  const { size, ...selectors } = roles;
  const names = Object.values(roles).map(({ name }) => name);
  // A size alone, such as a crawl's page limit, only signals a collection next to one.
  const reason =
    Object.keys(selectors).length > 0 || (size && itemsPath !== undefined)
      ? `it takes ${names.join(', ')}`
      : itemsPath === ''
      ? 'it returns an array'
      : undefined;
  if (!reason) {
    return { listLike: false };
  }
  const pagination = fromNames(document, roles, response, itemsPath);
  return {
    listLike: true,
    reason,
    ...(pagination ? { proposal: { pagination, basis: 'parameter and field names' } } : {}),
  };
};
