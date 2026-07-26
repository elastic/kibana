/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GENERIC_REQUEST_METHODS, type GenericRequestMethod } from '@kbn/connector-specs';

/**
 * A cURL command parsed into the parts a workflow `request` step cares about.
 * Auth is intentionally represented separately from `headers` so callers can
 * strip it (the connector injects its own credentials) while still telling the
 * user what was dropped.
 */
export interface ParsedCurl {
  method: GenericRequestMethod;
  /** The absolute URL exactly as it appeared in the command (query string included). */
  url: string;
  /** Non-auth headers, keyed by their original (case-preserved) name. */
  headers: Record<string, string>;
  /** Parsed request body, when a data flag was present. */
  body?: unknown;
  /** Whether the parsed body was valid JSON (vs. a raw string). */
  isJsonBody: boolean;
  /**
   * Auth-bearing inputs that were removed from {@link headers}. Surfaced so the
   * UI can note that the connector supplies authentication instead.
   */
  strippedAuth: {
    /** Names of `Authorization`/`x-api-key`/cookie-style headers that were removed. */
    headerNames: string[];
    /** True when a `-u`/`--user` basic-auth flag was present (and dropped). */
    hadUserFlag: boolean;
  };
}

export interface ParseCurlOk {
  ok: true;
  value: ParsedCurl;
}

export interface ParseCurlError {
  ok: false;
  error: string;
}

export type ParseCurlResult = ParseCurlOk | ParseCurlError;

const METHOD_SET = new Set<string>(GENERIC_REQUEST_METHODS);

// Header names whose value is credential material. Matched case-insensitively.
const AUTH_HEADER_NAMES = new Set(['authorization', 'x-api-key', 'api-key', 'cookie']);

const isAuthHeaderName = (name: string): boolean => AUTH_HEADER_NAMES.has(name.toLowerCase());

/**
 * Tokenizes a shell-ish command line, honoring single/double quotes and
 * backslash line continuations. This is intentionally minimal — enough for the
 * cURL commands people copy from API docs — and does not attempt full POSIX
 * shell semantics.
 */
const tokenize = (input: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let hasToken = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inSingle) {
      if (char === "'") {
        inSingle = false;
      } else {
        current += char;
      }
    } else if (inDouble) {
      if (char === '\\' && i + 1 < input.length) {
        const next = input[i + 1];
        // In double quotes, backslash only escapes a handful of characters.
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
          current += next;
          i++;
        } else {
          current += char;
        }
      } else if (char === '"') {
        inDouble = false;
      } else {
        current += char;
      }
    } else if (char === "'") {
      inSingle = true;
      hasToken = true;
    } else if (char === '"') {
      inDouble = true;
      hasToken = true;
    } else if (char === '\\') {
      // Line continuation (`\` at end of line) or escaped character.
      const next = input[i + 1];
      if (next === '\n' || next === '\r') {
        i++;
        if (next === '\r' && input[i + 1] === '\n') {
          i++;
        }
      } else if (next !== undefined) {
        current += next;
        hasToken = true;
        i++;
      }
    } else if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      if (hasToken) {
        tokens.push(current);
        current = '';
        hasToken = false;
      }
    } else {
      current += char;
      hasToken = true;
    }
  }

  if (hasToken) {
    tokens.push(current);
  }

  return tokens;
};

const stripInlineComment = (input: string): string => input.replace(/`.*?`/gs, ' ');

const parseHeaderToken = (raw: string): { name: string; value: string } | null => {
  const separatorIndex = raw.indexOf(':');
  if (separatorIndex <= 0) {
    return null;
  }
  const name = raw.slice(0, separatorIndex).trim();
  const value = raw.slice(separatorIndex + 1).trim();
  if (!name) {
    return null;
  }
  return { name, value };
};

const tryParseJson = (raw: string): { value: unknown; isJson: boolean } => {
  try {
    return { value: JSON.parse(raw), isJson: true };
  } catch {
    return { value: raw, isJson: false };
  }
};

// Flags that take a value we don't care about (auth, output, TLS, etc.). We
// skip the flag AND its argument so it doesn't get misread as the URL.
const VALUE_FLAGS_TO_SKIP = new Set([
  '--url', // handled specially below (it IS the url)
  '-o',
  '--output',
  '-A',
  '--user-agent',
  '-e',
  '--referer',
  '--connect-timeout',
  '--max-time',
  '-m',
  '--cacert',
  '--cert',
  '-E',
  '--key',
  '--cookie',
  '-b',
  '--cookie-jar',
  '-c',
]);

const DATA_FLAGS = new Set(['-d', '--data', '--data-raw', '--data-binary', '--data-ascii']);

/**
 * Parses a raw cURL command string into a {@link ParsedCurl}. Auth headers and
 * `-u/--user` are recognized and reported via `strippedAuth` but excluded from
 * `headers`, because a workflow `request` step reuses the connector's
 * configured authentication.
 */
export const parseCurl = (rawInput: string): ParseCurlResult => {
  const input = stripInlineComment(rawInput).trim();
  if (!input) {
    return { ok: false, error: 'Paste a cURL command to continue.' };
  }

  const tokens = tokenize(input);
  if (tokens.length === 0) {
    return { ok: false, error: 'Could not read the cURL command.' };
  }

  let cursor = 0;
  if (tokens[cursor]?.toLowerCase() === 'curl') {
    cursor++;
  }

  let explicitMethod: GenericRequestMethod | undefined;
  let url: string | undefined;
  const headers: Record<string, string> = {};
  const strippedHeaderNames: string[] = [];
  let hadUserFlag = false;
  let body: unknown;
  let isJsonBody = false;
  let hasBody = false;

  const consumeValue = (flag: string): string | null => {
    // Support `--flag=value` as well as `--flag value`.
    const eqIndex = flag.indexOf('=');
    if (eqIndex !== -1) {
      return flag.slice(eqIndex + 1);
    }
    cursor++;
    return cursor < tokens.length ? tokens[cursor] : null;
  };

  // Processes a single token, mutating the accumulators above. Returns an error
  // result to abort parsing, or `undefined` to move on to the next token.
  const handleToken = (token: string): ParseCurlError | undefined => {
    const flagName = token.includes('=') ? token.slice(0, token.indexOf('=')) : token;

    if (flagName === '-X' || flagName === '--request') {
      const value = consumeValue(token);
      if (value && METHOD_SET.has(value.toLowerCase())) {
        explicitMethod = value.toLowerCase() as GenericRequestMethod;
      } else if (value) {
        return { ok: false, error: `Unsupported HTTP method "${value}".` };
      }
    } else if (flagName === '-H' || flagName === '--header') {
      const value = consumeValue(token);
      const parsed = value ? parseHeaderToken(value) : null;
      if (parsed) {
        if (isAuthHeaderName(parsed.name)) {
          strippedHeaderNames.push(parsed.name);
        } else {
          headers[parsed.name] = parsed.value;
        }
      }
    } else if (flagName === '-u' || flagName === '--user') {
      consumeValue(token);
      hadUserFlag = true;
    } else if (DATA_FLAGS.has(flagName)) {
      const value = consumeValue(token);
      if (value !== null) {
        const parsed = tryParseJson(value);
        body = parsed.value;
        isJsonBody = parsed.isJson;
        hasBody = true;
      }
    } else if (flagName === '--url') {
      const value = consumeValue(token);
      if (value) {
        url = value;
      }
    } else if (VALUE_FLAGS_TO_SKIP.has(flagName)) {
      consumeValue(token);
    } else if (!token.startsWith('-') && url === undefined) {
      // First bare token is the URL. (Boolean flags such as -s/-k/-L/-v and
      // --compressed/--location are ignored by falling through.)
      url = token;
    }

    return undefined;
  };

  for (; cursor < tokens.length; cursor++) {
    const error = handleToken(tokens[cursor]);
    if (error) {
      return error;
    }
  }

  if (!url) {
    return { ok: false, error: 'No URL found in the cURL command.' };
  }

  // Normalize a bare host into an absolute URL (cURL defaults to http).
  const normalizedUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return { ok: false, error: `Could not parse the URL "${url}".` };
  }

  // cURL defaults to GET, or POST when a body is present without an explicit method.
  const method: GenericRequestMethod = explicitMethod ?? (hasBody ? 'post' : 'get');

  return {
    ok: true,
    value: {
      method,
      url: parsedUrl.toString(),
      headers,
      ...(hasBody ? { body } : {}),
      isJsonBody,
      strippedAuth: {
        headerNames: strippedHeaderNames,
        hadUserFlag,
      },
    },
  };
};
