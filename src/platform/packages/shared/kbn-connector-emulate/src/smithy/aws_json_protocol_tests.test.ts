/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import { loadContractOperations } from '../openapi';
import { validateResponse } from '../openapi/validate_response';
import { createAwsJsonService } from './aws_json';
import type { SmithyModel } from '.';
import { isSmithyModel } from '.';

// Runs the awsJson1_0 and awsJson1_1 protocol compliance tests AWS publishes with Smithy
// (`@httpRequestTests` and `@httpResponseTests`) that apply to servers. The fixtures and how to
// regenerate them are described in __fixtures__/aws_protocol_tests/README.md.
const FIXTURES = join(__dirname, '__fixtures__', 'aws_protocol_tests');

interface RequestTest {
  readonly id: string;
  readonly protocol: string;
  readonly method: string;
  readonly uri: string;
  /** For operations with an `@endpoint` host prefix: the client's host and the one it calls. */
  readonly host?: string;
  readonly resolvedHost?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly queryParams?: readonly string[];
  readonly body?: string;
  readonly appliesTo?: 'client' | 'server';
}

interface ResponseTest {
  readonly id: string;
  readonly protocol: string;
  readonly code: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly appliesTo?: 'client' | 'server';
}

const SERVICES = [
  ['awsJson1_0', 'json10.smithy.json'],
  ['awsJson1_1', 'json11.smithy.json'],
] as const;

const loadModel = (file: string): SmithyModel => {
  const model: unknown = JSON.parse(readFileSync(join(FIXTURES, file), 'utf8'));
  if (!isSmithyModel(model)) {
    throw new Error(`${file} is not a Smithy model`);
  }
  return model;
};

const testsOf = <T extends { protocol: string; appliesTo?: string }>(
  model: SmithyModel,
  trait: string,
  protocol: string
): Array<[string, string, T]> =>
  Object.entries(model.shapes).flatMap(([shapeId, shape]) => {
    const cases = shape.traits?.[trait];
    return (Array.isArray(cases) ? (cases as T[]) : [])
      .filter(
        (test) => test.protocol === `aws.protocols#${protocol}` && test.appliesTo !== 'client'
      )
      .map((test): [string, string, T] => [(test as { id?: string }).id ?? '', shapeId, test]);
  });

describe.each(SERVICES)('%s protocol tests', (protocol, file) => {
  const model = loadModel(file);
  const service = createAwsJsonService(model);
  const [host] = service.document.servers as Array<{ url: string }>;
  const origin = host.url.replace('{region}', 'us-east-1');
  const signed = 'security' in service.document;
  const [serviceId] = Object.entries(model.shapes).find(
    ([, shape]) => shape.type === 'service'
  ) ?? [''];
  const targetPrefix = serviceId.split('#')[1];
  const operations = loadContractOperations(service.document);

  it.each(testsOf<RequestTest>(model, 'smithy.test#httpRequestTests', protocol))(
    'accepts the request of %s',
    async (_, operationId, test) => {
      const { fetch, calls } = createEmulatorFetch({ specs: [model] });
      const query = test.queryParams?.length ? `?${test.queryParams.join('&')}` : '';
      // `foo.` when the test resolves `example.com` to `foo.example.com`.
      const hostPrefix =
        test.host && test.resolvedHost?.endsWith(test.host)
          ? test.resolvedHost.slice(0, -test.host.length)
          : '';
      const url = new URL(`${origin}${test.uri}${query}`);
      url.hostname = `${hostPrefix}${url.hostname}`;
      const headers = new Headers(test.headers);
      // Tests of what clients add on top of the protocol, such as host prefixes and compression,
      // leave out the headers every request carries.
      if (!headers.has('x-amz-target')) {
        headers.set('x-amz-target', `${targetPrefix}.${operationId.split('#')[1]}`);
      }
      if (!headers.has('content-type')) {
        headers.set(
          'content-type',
          `application/x-amz-json-${protocol.slice(-3).replace('_', '.')}`
        );
      }
      // The tests leave signing to SigV4's own tests.
      if (signed) {
        headers.set('authorization', 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE');
      }

      await fetch(url, { method: test.method, headers, body: test.body || undefined });

      expect(calls).toEqual([
        expect.objectContaining({
          operation: operationId.split('#')[1],
          status: 200,
          requestViolations: [],
          responseViolations: [],
        }),
      ]);
    }
  );

  it.each(testsOf<ResponseTest>(model, 'smithy.test#httpResponseTests', protocol))(
    'accepts the response of %s',
    (_, shapeId, test) => {
      // Error tests are on the error shape; any operation that declares it can answer it.
      const name = shapeId.split('#')[1];
      const operation = operations.find(
        ({ id }) =>
          id === name ||
          model.shapes[`${shapeId.split('#')[0]}#${id}`]?.errors?.some(
            ({ target }) => target === shapeId
          )
      );
      const body = test.body ? JSON.parse(test.body) : undefined;

      expect(operation).toBeDefined();
      expect(
        validateResponse(operation!, {
          statusCode: test.code,
          headers: Object.fromEntries(
            Object.entries(test.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value])
          ),
          body,
        })
      ).toEqual([]);
    }
  );
});
