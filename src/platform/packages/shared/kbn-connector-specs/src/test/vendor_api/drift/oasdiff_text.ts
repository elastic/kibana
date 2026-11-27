/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Everything the check knows about `oasdiff`'s own vocabulary: what its rule ids mean, and how to
 * read back the parts of a change that only its sentence holds, such as the property a deprecation
 * names or the field an addition adds.
 *
 * `oasdiff` reports a change as a rule id, a level and a sentence. The id says what kind of change
 * it is; everything more specific is prose. Reading that prose is a coupling to the tool's wording,
 * so it lives here, next to {@link ./run_oasdiff}, rather than wherever a caller needs a part of it:
 * when a release rewords a message, this is the file to fix.
 */

/** What a reviewer looks at, from a change's rule id. */
export type ChangeCategory =
  | 'deprecated'
  | 'sunset'
  | 'auth-changed'
  | 'removed'
  | 'schema-removed'
  | 'request-changed'
  | 'response-changed'
  | 'other';

/**
 * The category of a rule id. Removals come first: `api-path-removed-without-deprecation` mentions
 * a deprecation it didn't have.
 */
export const changeCategoryOf = (id: string): ChangeCategory => {
  if (id.startsWith('api-security-')) {
    return 'auth-changed';
  }
  if (id === 'api-schema-removed') {
    return 'schema-removed';
  }
  if (/^api-.*removed/.test(id)) {
    return 'removed';
  }
  if (/sunset/.test(id)) {
    return 'sunset';
  }
  if (/deprecat/.test(id)) {
    return 'deprecated';
  }
  if (REQUEST_CHANGE.test(id)) {
    return 'request-changed';
  }
  return id.startsWith('response-') ? 'response-changed' : 'other';
};

// Changes to what a request sends or how it authenticates. Running an action against the latest
// spec verifies them: its requests are validated against it, and so are their credentials and
// OAuth scopes.
const REQUEST_CHANGE = /^(request-|new-(required|optional)-request-|api-security-)/;

// Changes to what a response holds.
const RESPONSE_CHANGE = /^(response-|api-schema-removed$)/;

// Breaking response changes that field use verifies: only the response body fields the actions
// read matter, and those are compared one by one. Field use only sees parsed JSON bodies, so
// changes to response headers, statuses and media types still need review.
const VERIFIED_BY_FIELD_USE =
  /^(response-(body|mediatype|((required|optional)-)?(write-only-)?property)-|api-schema-removed$)/;

/** Whether running an action against the latest spec verifies this change. */
export const isVerifiedByRunning = (id: string): boolean => REQUEST_CHANGE.test(id);

/** Whether comparing the response fields an action reads verifies this change. */
export const isVerifiedByFieldUse = (id: string): boolean => VERIFIED_BY_FIELD_USE.test(id);

/** Whether the change is to what a request sends or how it authenticates. */
export const isRequestChange = (id: string): boolean => REQUEST_CHANGE.test(id);

/** Whether the change is to what a response holds. */
export const isResponseChange = (id: string): boolean => RESPONSE_CHANGE.test(id);

/** Every name between backticks in a message, in order. */
export const quoted = (text: string): string[] =>
  [...text.matchAll(/`([^`]+)`/g)].map(([, name]) => name);

// `https://www.googleapis.com/auth/gmail.labels` as `gmail.labels`, `https://mail.google.com/` as
// `mail.google.com`.
export const scopeName = (scope: string): string => {
  const trimmed = scope.replace(/\/+$/, '');
  return trimmed.slice(trimmed.lastIndexOf('/') + 1);
};

/** A scheme an endpoint's security asks for, with one of its scopes when it has any. */
export interface SecurityGrant {
  readonly scheme: string;
  readonly scope?: string;
}

/** What a security change adds or removes, or undefined for a rule that isn't about that. */
export const securityGrantsOf = (id: string, text: string): SecurityGrant[] | undefined => {
  const names = quoted(text);
  if (id === 'api-security-added' || id === 'api-security-removed') {
    // `Oauth2: [https://…/auth/a, https://…/auth/b]`, or `apiKey` for a scheme without scopes.
    const match = /^([^:[]+?)(?::\s*\[([^\]]*)\])?$/.exec(names[0] ?? '');
    if (match === null) return undefined;
    const scheme = match[1].trim();
    const scopes = (match[2] ?? '')
      .split(',')
      .map((scope) => scope.trim())
      .filter((scope) => scope !== '');
    return scopes.length === 0 ? [{ scheme }] : scopes.map((scope) => ({ scheme, scope }));
  }
  if (id === 'api-security-scope-added' || id === 'api-security-scope-removed') {
    // The security scope `pipeline:write` was added to the endpoint's security scheme `oauth2`.
    const [scope, scheme] = names;
    return scope === undefined || scheme === undefined ? undefined : [{ scheme, scope }];
  }
  if (/^api-security-component-oauth-scope-(added|removed)$/.test(id)) {
    // The component security scheme `oauth2` oauth `clientCredentials` flow scope `write` was added.
    const scheme = names[0];
    const scope = names[names.length - 1];
    return names.length < 2 ? undefined : [{ scheme, scope }];
  }
  if (id === 'api-security-component-added' || id === 'api-security-component-removed') {
    return names[0] === undefined ? undefined : [{ scheme: names[0] }];
  }
  return undefined;
};

// "the `query` request parameter `status`": the location comes first, then the parameter's name.
const REQUEST_PARAMETER = /`(query|header|path|cookie)` request parameter `([^`]+)`/;

/** The location and name of the request parameter a change is about. */
export const requestParameterOf = (
  text: string
): { readonly location: string; readonly name: string } | undefined => {
  const match = REQUEST_PARAMETER.exec(text);
  return match === null ? undefined : { location: match[1], name: match[2] };
};

// `allOf[#/components/schemas/Options]/waitFor`: oasdiff names the subschema a property is in.
const COMPOSITION = /(?:allOf|anyOf|oneOf)\[[^\]]*\]\/?/g;

/** A property path oasdiff names, as field use paths are: without the subschemas it is in. */
export const toFieldPath = (oasdiffPath: string): string =>
  oasdiffPath.replace(COMPOSITION, '').replace(/\/$/, '');

const DEPRECATED_PROPERTY = /^(request|response)-property-deprecated$/;

/** The property a deprecation names, as a field use path. */
export const deprecatedPropertyOf = (id: string, text: string): string | undefined => {
  const named = DEPRECATED_PROPERTY.test(id) ? text.match(/property `([^`]+)`/)?.[1] : undefined;
  return named === undefined ? undefined : toFieldPath(named);
};

const NAMED_COMPONENT = /`([^`]+)`/;

/** The first thing a message names in backticks, e.g. the schema a removal removed. */
export const namedComponentOf = (text: string): string | undefined =>
  text.match(NAMED_COMPONENT)?.[1];

/**
 * - `request-option`: a new property of the request body.
 * - `query-parameter`: a new query parameter.
 * - `request-value`: a new value or form of a request property, e.g. an enum value.
 * - `response-field`: a new property of the response.
 */
export type AdditionKind =
  | 'request-option'
  | 'query-parameter'
  | 'request-value'
  | 'response-field';

/** What a change adds to an operation, read out of its message. */
export interface ParsedAddition {
  readonly kind: AdditionKind;
  /** As field use paths are, or the parameter's name. */
  readonly field: string;
  /** For `request-value`, the new enum value, if it is one. */
  readonly value?: string;
}

/** What a change adds, or undefined when it adds nothing the connector's consumers could use. */
export const additionOf = (id: string, text: string): ParsedAddition | undefined => {
  const match = (pattern: RegExp) => text.match(pattern) ?? undefined;
  switch (id) {
    case 'new-optional-request-property': {
      const named = match(/request property `([^`]+)`/);
      return named && { kind: 'request-option', field: toFieldPath(named[1]) };
    }
    case 'new-optional-request-parameter': {
      const parameter = requestParameterOf(text);
      return parameter?.location === 'query'
        ? { kind: 'query-parameter', field: parameter.name }
        : undefined;
    }
    case 'request-property-enum-value-added': {
      const named = match(/new `([^`]+)` enum value to the request property `([^`]+)`/);
      return named && { kind: 'request-value', field: toFieldPath(named[2]), value: named[1] };
    }
    case 'request-property-one-of-added':
    case 'request-property-any-of-added': {
      const named = match(/to the `([^`]+)` request property/);
      return named && { kind: 'request-value', field: toFieldPath(named[1]) };
    }
    case 'response-optional-property-added':
    case 'response-required-property-added': {
      const named = match(/property `([^`]+)` to the response/);
      return named && { kind: 'response-field', field: toFieldPath(named[1]) };
    }
    default:
      return undefined;
  }
};
