/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Violation } from '../contract/types';
import type { RejectedResponse, ResponseFixture } from '../engine/response_engine';
import { isNamedOperationRef, toOperationKey } from '../engine/response_engine';
import type { ContractCall, Emulator } from './create_emulator_fetch';
import type { OperationDescription } from './describe_operation';

/** Several connectors' emulators behind one `fetch`, e.g. for one Kibana running all of them. */
export interface CombinedEmulator extends Emulator {
  /** The connectors, in the order requests that match several of them are routed. */
  readonly connectors: readonly string[];
  /**
   * Empties the calls and responder state, and drops the runtime fixtures, of one connector, or
   * of all when none is given.
   */
  readonly reset: (connector?: string) => void;
  readonly runtimeFixtures: {
    /**
     * Sets each fixture on its `connector`'s emulator, else `connector`'s, else on the one
     * connector whose specs have its operation. Fixtures that match no connector or several are
     * rejected; when any is, none is set.
     */
    readonly set: (
      fixtures: readonly ResponseFixture[],
      options?: { readonly connector?: string }
    ) => readonly RejectedResponse[];
    /** The runtime fixtures in effect, each with its `connector`. */
    readonly list: (options?: { readonly connector?: string }) => readonly ResponseFixture[];
    readonly clear: (options?: {
      readonly id?: string;
      readonly source?: string;
      readonly connector?: string;
    }) => void;
  };
  /** Describes an OpenAPI operation of `connector`, or of the first connector that has it. */
  readonly describeOperation: (
    id: string,
    options?: { readonly source?: string; readonly connector?: string }
  ) => (OperationDescription & { readonly connector: string }) | undefined;
}

const CONNECTOR_NAME = /^[a-z0-9][a-z0-9_-]*$/;
const TAG_PREFIX = 'emulate-';
const TOKEN_FIELDS = ['access_token', 'refresh_token', 'id_token'] as const;
// Bodies are scanned for tags; larger ones, such as file uploads, only by their start.
const MAX_SCANNED_BODY = 1024 * 1024;
const JWT = /\b[\w-]{8,}\.([\w-]{8,})\.[\w-]*/g;
const JSON_HEADERS = { 'content-type': 'application/json' };

/**
 * The credential that routes a connector's requests to its emulator in `combineEmulators`, e.g.
 * `emulate-outlook`. Use it as (or in) any secret or config value the connector sends: an API
 * key, a token, a Basic auth user or password, an OAuth client ID.
 */
export const emulatorCredential = (connector: string): string => `${TAG_PREFIX}${connector}`;

const decodeBase64 = (text: string): string => {
  try {
    return Buffer.from(text, 'base64').toString('utf8');
  } catch {
    return '';
  }
};

const decodeComponent = (text: string): string => {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '));
  } catch {
    return text;
  }
};

/** The texts of a request a credential can be in: headers, Basic auth, query, body, JWTs. */
const credentialTexts = async (request: Request): Promise<string[]> => {
  const texts = [decodeComponent(new URL(request.url).search)];
  request.headers.forEach((value) => {
    texts.push(value);
    const basic = /^basic\s+(\S+)/i.exec(value);
    if (basic) {
      texts.push(decodeBase64(basic[1]));
    }
  });
  const body = await request.text();
  if (body) {
    const scanned = body.slice(0, MAX_SCANNED_BODY);
    texts.push(scanned, decodeComponent(scanned));
  }
  // Service accounts send JWT assertions, whose claims (such as `iss`) can carry the tag.
  for (const text of [...texts]) {
    for (const [, payload] of text.matchAll(JWT)) {
      texts.push(decodeBase64(payload.replace(/-/g, '+').replace(/_/g, '/')));
    }
  }
  return texts;
};

const tagTokens = async (response: Response, tag: string): Promise<Response> => {
  if (!/json/.test(response.headers.get('content-type') ?? '')) {
    return response;
  }
  const body = await response.json();
  for (const field of TOKEN_FIELDS) {
    if (typeof body?.[field] === 'string') {
      body[field] = `${tag}.${body[field]}`;
    }
  }
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(JSON.stringify(body), { status: response.status, headers });
};

/**
 * Serves several connectors' emulators through one `fetch`, so one proxy and one Kibana can run
 * them all. Each connector keeps its own specs, overlay, fixtures and recordings. A request goes
 * to the connector whose `emulatorCredential` it carries, in a header, Basic auth, the query, the
 * body or a JWT assertion; the tokens that connector's token URLs issue carry the credential
 * too. Other requests go to the first connector whose specs match the URL, so connectors that
 * share a vendor host need the credential to get their own responses. Every call is recorded
 * in `calls` with its `connector`.
 */
export const combineEmulators = (
  emulators: Readonly<Record<string, Emulator>>
): CombinedEmulator => {
  const connectors = Object.keys(emulators);
  const invalid = connectors.filter((name) => !CONNECTOR_NAME.test(name));
  if (connectors.length === 0 || invalid.length > 0) {
    throw new Error(
      connectors.length === 0
        ? 'combineEmulators needs at least one emulator'
        : `Connector names must be lowercase letters, digits, _ and -, starting with a letter or digit: ${invalid.join(
            ', '
          )}`
    );
  }
  // The name must end the tag, so emulate-sharepoint-online isn't taken for sharepoint.
  const tagPattern = new RegExp(`(?<![\\w-])${TAG_PREFIX}(${connectors.join('|')})(?![\\w-])`);
  const calls: ContractCall[] = [];
  const collected = new Map<string, number>();

  // Copies the calls a connector's emulator recorded since the last copy, in its order.
  const collect = (connector: string) => {
    const { calls: own } = emulators[connector];
    const from = Math.min(collected.get(connector) ?? 0, own.length);
    for (const call of own.slice(from)) {
      calls.push({ ...call, connector });
    }
    collected.set(connector, own.length);
  };

  const checkConnector = (connector: string): string => {
    if (!(connector in emulators)) {
      throw new Error(`No emulator for connector ${connector}`);
    }
    return connector;
  };

  // The connector a fixture is for: the one it names, else the one whose specs have its operation.
  const routeFixture = (
    { operation: ref }: ResponseFixture,
    named: string | undefined
  ): { connector?: string; rejected?: RejectedResponse } => {
    const label = isNamedOperationRef(ref) ? ref.name : toOperationKey(ref);
    const reject = (code: string, message: string) => {
      const violation: Violation = { path: ['connector'], code, message };
      return {
        rejected: { source: 'fixture' as const, operation: label, violations: [violation] },
      };
    };
    if (named !== undefined) {
      return named in emulators
        ? { connector: named }
        : reject(
            'connector',
            `No emulator for connector ${named}; there are ${connectors.join(', ')}`
          );
    }
    const having = connectors.filter((name) =>
      emulators[name].operations.some((operation) =>
        isNamedOperationRef(ref)
          ? 'name' in operation && operation.name === ref.name
          : 'method' in operation &&
            operation.method === ref.method.toUpperCase() &&
            operation.path === ref.path &&
            (ref.source === undefined || operation.source === ref.source)
      )
    );
    if (having.length === 1) {
      return { connector: having[0] };
    }
    return having.length === 0
      ? reject('operation', `No connector's specs have ${label}`)
      : reject('connector', `${having.join(', ')} all have ${label}; name the connector`);
  };

  const findTagged = async (request: Request): Promise<string | undefined> => {
    for (const text of await credentialTexts(request)) {
      const match = tagPattern.exec(text);
      if (match) {
        return match[1];
      }
    }
  };

  const combinedFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const tagged = await findTagged(request.clone());
    const connector =
      tagged ??
      connectors.find((name) => emulators[name].answers(request.method, url)) ??
      (connectors.length === 1 ? connectors[0] : undefined);

    if (connector === undefined) {
      const description = `${request.method} ${url.origin}${url.pathname}`;
      calls.push({
        request: description,
        status: 404,
        requestViolations: [],
        responseViolations: [],
      });
      return new Response(
        JSON.stringify({
          title: 'No matching operation',
          detail: `${description}: no connector's specs match the URL (connectors: ${connectors.join(
            ', '
          )})`,
        }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    const emulator = emulators[connector];
    const recorded = emulator.calls.length;
    const response = await emulator.fetch(request);
    const issuedToken = emulator.calls.slice(recorded).some(({ token }) => token);
    collect(connector);
    return tagged && issuedToken ? tagTokens(response, emulatorCredential(tagged)) : response;
  };

  return {
    fetch: combinedFetch,
    answers: (method, url) => connectors.some((name) => emulators[name].answers(method, url)),
    calls,
    connectors,
    operations: connectors.flatMap((connector) =>
      emulators[connector].operations.map((operation) => ({ ...operation, connector }))
    ),
    rejectedResponses: connectors.flatMap((connector) =>
      emulators[connector].rejectedResponses.map((rejected) => ({ ...rejected, connector }))
    ),
    runtimeFixtures: {
      set: (fixtures, { connector: given } = {}) => {
        const routed = fixtures.map((fixture) => ({
          fixture,
          ...routeFixture(fixture, fixture.connector ?? given),
        }));
        const unrouted = routed.flatMap(({ rejected }) => (rejected ? [rejected] : []));
        if (unrouted.length > 0) {
          return unrouted;
        }
        const byConnector = new Map<string, ResponseFixture[]>();
        for (const { fixture, connector } of routed) {
          if (connector !== undefined) {
            byConnector.set(connector, [...(byConnector.get(connector) ?? []), fixture]);
          }
        }
        // Each emulator sets all or none of its fixtures; undo the others when one rejects.
        const before = new Map(
          [...byConnector.keys()].map((name) => [name, emulators[name].runtimeFixtures.list()])
        );
        const rejected = [...byConnector].flatMap(([name, own]) =>
          emulators[name].runtimeFixtures
            .set(own)
            .map((entry): RejectedResponse => ({ ...entry, connector: name }))
        );
        if (rejected.length > 0) {
          for (const [name, previous] of before) {
            emulators[name].runtimeFixtures.clear();
            emulators[name].runtimeFixtures.set(previous);
          }
        }
        return rejected;
      },
      list: ({ connector } = {}) =>
        (connector === undefined ? connectors : [checkConnector(connector)]).flatMap((name) =>
          emulators[name].runtimeFixtures.list().map((fixture) => ({ ...fixture, connector: name }))
        ),
      clear: ({ connector, ...options } = {}) =>
        (connector === undefined ? connectors : [checkConnector(connector)]).forEach((name) =>
          emulators[name].runtimeFixtures.clear(options)
        ),
    },
    describeOperation: (id, { connector, source } = {}) => {
      for (const name of connector === undefined ? connectors : [checkConnector(connector)]) {
        const description = emulators[name].describeOperation(id, { source });
        if (description) {
          return { ...description, connector: name };
        }
      }
      return undefined;
    },
    reset: (connector) => {
      if (connector === undefined) {
        connectors.forEach((name) => emulators[name].reset());
        collected.clear();
        calls.length = 0;
        return;
      }
      emulators[checkConnector(connector)].reset();
      collected.set(connector, 0);
      const kept = calls.filter((call) => call.connector !== connector);
      calls.splice(0, calls.length, ...kept);
    },
  };
};
