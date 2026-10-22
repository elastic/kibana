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
import { Parser } from 'xml2js';
import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import { loadContractOperations } from '../openapi';
import type { ContractOperation } from '../openapi';
import { findResponse, validateResponse } from '../openapi/validate_response';
import { fromXml, toXml } from '../xml/xml_codec';
import type { SmithyModel } from '.';
import { convertSmithy, isSmithyModel } from '.';

// Runs the restXml protocol compliance tests AWS publishes with Smithy (`@httpRequestTests` and
// `@httpResponseTests`) that apply to servers. The fixtures and how to regenerate them are
// described in __fixtures__/aws_protocol_tests/README.md.
const FIXTURES = join(__dirname, '__fixtures__', 'aws_protocol_tests');

interface RequestTest {
  readonly id: string;
  readonly protocol: string;
  readonly method: string;
  readonly uri: string;
  readonly host?: string;
  readonly resolvedHost?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly queryParams?: readonly string[];
  readonly body?: string;
  readonly bodyMediaType?: string;
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

const loadModel = (file: string): SmithyModel => {
  const model: unknown = JSON.parse(readFileSync(join(FIXTURES, file), 'utf8'));
  if (!isSmithyModel(model)) {
    throw new Error(`${file} is not a Smithy model`);
  }
  return model;
};

const testsOf = <T extends { id: string; protocol: string; appliesTo?: string }>(
  model: SmithyModel,
  trait: string
): Array<[string, string, T]> =>
  Object.entries(model.shapes).flatMap(([shapeId, shape]) => {
    const cases = shape.traits?.[trait];
    return (Array.isArray(cases) ? (cases as T[]) : [])
      .filter((test) => test.protocol === 'aws.protocols#restXml' && test.appliesTo !== 'client')
      .map((test): [string, string, T] => [test.id, shapeId, test]);
  });

const lowerCaseKeys = (headers: Readonly<Record<string, string>> = {}) =>
  Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));

interface CanonicalElement {
  readonly name: string;
  readonly attributes: Record<string, string>;
  readonly children: CanonicalElement[] | string;
}

/**
 * Response bodies that can't be written back as they are, and why. Every other response the
 * tests specify must come out the same after reading it.
 */
const NOT_WRITTEN_BACK: Readonly<Record<string, string>> = {
  InvalidGreetingError:
    'The body has an element the model does not define (AnotherSetting), which reading drops.',
};

// An element tree to compare XML documents by: attributes as a map, text only for leaves, and
// children sorted by name, as structure members may come in any order (lists keep their order).
const canonicalize = (xml: string): CanonicalElement | undefined => {
  let root: CanonicalElement | undefined;
  const toCanonical = (node: Record<string, unknown>): CanonicalElement => {
    const children = Array.isArray(node.$$) ? (node.$$ as Array<Record<string, unknown>>) : [];
    return {
      name: String(node['#name']),
      attributes: (node.$ ?? {}) as Record<string, string>,
      children:
        children.length > 0
          ? children.map(toCanonical).sort((a, b) => a.name.localeCompare(b.name))
          : typeof node._ === 'string'
          ? node._
          : '',
    };
  };
  new Parser({
    explicitRoot: true,
    explicitChildren: true,
    preserveChildrenOrder: true,
    async: false,
  }).parseString(xml, (error: Error | null, parsed: Record<string, Record<string, unknown>>) => {
    root = error ? undefined : toCanonical(Object.values(parsed)[0]);
  });
  return root;
};

describe.each([
  ['RestXml', 'restxml.smithy.json'],
  ['RestXmlWithNamespace', 'restxml_xmlns.smithy.json'],
  ['S3', 's3.smithy.json'],
])('restXml protocol tests of %s', (_, file) => {
  const model = loadModel(file);
  const document = convertSmithy(model);
  const [server] = document.servers as Array<{ url: string }>;
  const origin = server.url.replace('{region}', 'us-west-2');
  const signed = 'security' in document;
  const operations = loadContractOperations(document);
  const operationOf = (shapeId: string): ContractOperation | undefined => {
    const name = shapeId.split('#')[1];
    return operations.find(
      ({ id }) =>
        id === name ||
        model.shapes[`${shapeId.split('#')[0]}#${id}`]?.errors?.some(
          ({ target }) => target === shapeId
        )
    );
  };

  it.each(testsOf<RequestTest>(model, 'smithy.test#httpRequestTests'))(
    'accepts the request of %s',
    async (__, operationId, test) => {
      const { fetch, calls } = createEmulatorFetch({ specs: [document] });
      const query = test.queryParams?.length ? `?${test.queryParams.join('&')}` : '';
      const url = new URL(`${origin}${test.uri}${query}`);
      // Tests of host prefixes and virtual-hosted buckets resolve the client's host: `foo.` on
      // `example.com` is `foo.` on the service's host, and other hosts, such as S3's accelerate
      // endpoints, are taken as they are.
      if (test.host && test.resolvedHost?.endsWith(`.${test.host}`)) {
        url.hostname = `${test.resolvedHost.slice(0, -test.host.length)}${url.hostname}`;
      } else if (test.resolvedHost) {
        url.hostname = test.resolvedHost;
      }
      const headers = new Headers(test.headers);
      // Tests of what clients add on top of the protocol, such as host prefixes, may leave out
      // the Content-Type every request with a body carries.
      if (test.body && test.bodyMediaType && !headers.has('content-type')) {
        headers.set('content-type', test.bodyMediaType);
      }
      // The tests leave signing to SigV4's own tests.
      if (signed) {
        headers.set('authorization', 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE');
      }

      // As bytes, so fetch doesn't add a Content-Type the test doesn't send.
      await fetch(url, {
        method: test.method,
        headers,
        body: test.body ? Buffer.from(test.body) : undefined,
      });

      expect(calls).toEqual([
        expect.objectContaining({
          operation: operationId.split('#')[1],
          requestViolations: [],
          responseViolations: [],
        }),
      ]);
    }
  );

  describe.each(testsOf<ResponseTest>(model, 'smithy.test#httpResponseTests'))(
    'the response of %s',
    (__, shapeId, test) => {
      const operation = operationOf(shapeId);
      const headers = lowerCaseKeys(test.headers);

      it('passes response validation', () => {
        expect(operation).toBeDefined();
        expect(
          validateResponse(operation!, { statusCode: test.code, headers, body: test.body })
        ).toEqual([]);
      });

      if (test.body && /xml/.test(headers['content-type'] ?? '') && !NOT_WRITTEN_BACK[test.id]) {
        it('is written back the same after reading it', () => {
          const content = findResponse(operation!.responses, test.code)?.contents.find(
            ({ mediaType }) => mediaType === 'application/xml'
          );
          const read = fromXml(test.body!, content?.schema?.schema, document);
          if ('error' in read) {
            throw new Error(read.error);
          }

          expect(canonicalize(toXml(read.value, content?.schema?.schema, document))).toEqual(
            canonicalize(test.body!)
          );
        });
      }
    }
  );
});
