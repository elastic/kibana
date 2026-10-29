/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from '../fetch/create_emulator_fetch';
import { createAwsJsonService } from './aws_json';
import type { SmithyModel } from '.';

const NS = 'example.metrics';
const id = (name: string) => `${NS}#${name}`;
const ref = (name: string) => ({ target: name.includes('#') ? name : id(name) });
const required = { 'smithy.api#required': {} };

// Shaped like CloudWatch: awsJson1_0 with SigV4, errors and a blob output.
const model: SmithyModel = {
  smithy: '2.0',
  shapes: {
    [id('Metrics_20240101')]: {
      type: 'service',
      version: '2024-01-01',
      operations: [ref('GetMetricData'), ref('GetWidget')],
      traits: {
        'aws.api#service': { sdkId: 'Metrics', endpointPrefix: 'metrics' },
        'aws.auth#sigv4': { name: 'metrics' },
        'aws.protocols#awsJson1_0': {},
      },
    },
    [id('GetMetricData')]: {
      type: 'operation',
      input: ref('GetMetricDataInput'),
      output: ref('GetMetricDataOutput'),
      errors: [ref('InvalidNextToken'), ref('LimitExceeded')],
    },
    [id('GetMetricDataInput')]: {
      type: 'structure',
      members: {
        MetricName: { target: 'smithy.api#String', traits: required },
        Period: {
          target: 'smithy.api#Integer',
          traits: { 'smithy.api#range': { min: 1 }, 'smithy.api#jsonName': 'period' },
        },
        Threshold: { target: 'smithy.api#Double' },
        NextToken: { target: 'smithy.api#String' },
      },
    },
    [id('GetMetricDataOutput')]: {
      type: 'structure',
      members: {
        Values: { target: id('Values') },
        Timestamp: { target: 'smithy.api#Timestamp' },
      },
    },
    [id('Values')]: { type: 'list', member: ref('smithy.api#Double') },
    [id('GetWidget')]: { type: 'operation', output: ref('GetWidgetOutput') },
    [id('GetWidgetOutput')]: {
      type: 'structure',
      members: { Image: { target: 'smithy.api#Blob' } },
    },
    [id('InvalidNextToken')]: {
      type: 'structure',
      members: { Message: { target: 'smithy.api#String' } },
      traits: { 'smithy.api#error': 'client' },
    },
    [id('LimitExceeded')]: {
      type: 'structure',
      members: { Message: { target: 'smithy.api#String' } },
      traits: { 'smithy.api#error': 'client' },
    },
  },
};

const ORIGIN = 'https://metrics.eu-west-1.amazonaws.com';
const SIGNED = {
  authorization: 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20240101/eu-west-1/metrics',
};

describe('AWS JSON services from Smithy models', () => {
  const send = (
    fetch: typeof globalThis.fetch,
    target: string,
    body: unknown,
    headers: Record<string, string> = {}
  ) =>
    fetch(`${ORIGIN}/`, {
      method: 'POST',
      headers: {
        ...SIGNED,
        'content-type': 'application/x-amz-json-1.0',
        'x-amz-target': target,
        ...headers,
      },
      body: JSON.stringify(body),
    });

  it('routes requests by X-Amz-Target and answers with the output shape', async () => {
    const { fetch, calls } = createEmulatorFetch({ specs: { metrics: model } });

    const response = await send(fetch, 'Metrics_20240101.GetMetricData', {
      MetricName: 'CPUUtilization',
      Period: 60,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/x-amz-json-1.0');
    expect(await response.json()).toEqual({ Values: [0], Timestamp: 0 });
    expect(calls).toEqual([
      {
        request: `POST ${ORIGIN}/`,
        operation: 'GetMetricData',
        matched: { method: 'post', path: '/GetMetricData', source: 'metrics' },
        status: 200,
        requestViolations: [],
        responseViolations: [],
      },
    ]);
  });

  it("accepts CloudWatch's legacy application/json with Content-Encoding: amz-1.0", async () => {
    const { fetch } = createEmulatorFetch({ specs: [model] });

    const response = await send(
      fetch,
      'Metrics_20240101.GetMetricData',
      { MetricName: 'CPUUtilization' },
      { 'content-type': 'application/json', 'content-encoding': 'amz-1.0' }
    );

    expect(response.status).toBe(200);
  });

  it('validates the input shape by member name, with NaN and Infinity for doubles', async () => {
    const { fetch, calls } = createEmulatorFetch({ specs: [model] });

    const valid = await send(fetch, 'Metrics_20240101.GetMetricData', {
      MetricName: 'm',
      Threshold: 'NaN',
    });
    // awsJson ignores @jsonName, so `period` is not the `Period` member.
    const invalid = await send(fetch, 'Metrics_20240101.GetMetricData', { Period: 0, period: 60 });

    expect(valid.status).toBe(200);
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      __type: 'ValidationException',
      message: expect.stringContaining('MetricName'),
    });
    expect(calls[1].requestViolations.map(({ path }) => path.join('.'))).toEqual([
      'body',
      'body.Period',
    ]);
  });

  it('takes an empty body only for inputs without required members', async () => {
    const { fetch } = createEmulatorFetch({ specs: [model] });

    // `GetMetricData` requires `MetricName`, so omitting the whole input is as invalid as `{}`.
    const withRequired = await send(fetch, 'Metrics_20240101.GetMetricData', undefined);
    const noInput = await send(fetch, 'Metrics_20240101.GetWidget', undefined);

    expect(withRequired.status).toBe(400);
    expect(await withRequired.json()).toEqual({
      __type: 'ValidationException',
      message: expect.any(String),
    });
    expect(noInput.status).toBe(200);
  });

  it('answers as AWS does when a request reaches no operation or lacks credentials', async () => {
    const { fetch, calls } = createEmulatorFetch({ specs: [model] });

    const unknown = await send(fetch, 'Metrics_20240101.DeleteEverything', {});
    const otherService = await send(fetch, 'Logs_20140328.GetMetricData', {});
    const xml = await send(
      fetch,
      'Metrics_20240101.GetMetricData',
      {},
      { 'content-type': 'text/xml' }
    );
    const unsigned = await send(fetch, 'Metrics_20240101.GetWidget', {}, { authorization: '' });
    const elsewhere = await fetch(`${ORIGIN}/GetWidget`, { method: 'POST', headers: SIGNED });

    expect(
      await Promise.all(
        [unknown, otherService, xml, unsigned, elsewhere].map(async (response) => [
          response.status,
          (await response.json()).__type,
        ])
      )
    ).toEqual([
      [400, 'UnknownOperationException'],
      [400, 'UnknownOperationException'],
      [400, 'SerializationException'],
      [403, 'MissingAuthenticationTokenException'],
      [404, 'UnknownOperationException'],
    ]);
    expect(calls.map(({ operation }) => operation)).toEqual([
      undefined,
      undefined,
      undefined,
      'GetWidget',
      undefined,
    ]);
  });

  it('serves fixtures, including modeled errors, and samples blobs as base64', async () => {
    const { fetch, calls, rejectedResponses } = createEmulatorFetch({
      specs: [model],
      fixtures: [
        {
          operation: { method: 'post', path: '/GetMetricData' },
          response: {
            status: 400,
            headers: { 'content-type': 'application/x-amz-json-1.0' },
            body: { __type: 'example.metrics#LimitExceeded', Message: 'Slow down' },
          },
        },
      ],
    });

    const limited = await send(fetch, 'Metrics_20240101.GetMetricData', { MetricName: 'm' });
    const widget = await send(fetch, 'Metrics_20240101.GetWidget', {});

    expect(limited.status).toBe(400);
    expect(await limited.json()).toEqual({
      __type: 'example.metrics#LimitExceeded',
      Message: 'Slow down',
    });
    expect(rejectedResponses).toEqual([]);
    expect(await widget.json()).toEqual({ Image: expect.any(String) });
    expect(calls.flatMap(({ responseViolations }) => responseViolations)).toEqual([]);
  });

  it('serves operations with an @endpoint host prefix from a subdomain', async () => {
    const { fetch } = createEmulatorFetch({ specs: [model] });

    const response = await fetch('https://data.metrics.eu-west-1.amazonaws.com/', {
      method: 'POST',
      headers: {
        ...SIGNED,
        'content-type': 'application/x-amz-json-1.0',
        'x-amz-target': 'Metrics_20240101.GetWidget',
      },
    });

    expect(response.status).toBe(200);
  });

  it('serves restJson1 models as their OpenAPI conversion', async () => {
    const restJson: SmithyModel = {
      smithy: '2.0',
      shapes: {
        [id('Widgets')]: {
          type: 'service',
          version: '1',
          operations: [ref('ListWidgets')],
          traits: {
            'aws.api#service': { endpointPrefix: 'widgets' },
            'aws.protocols#restJson1': {},
          },
        },
        [id('ListWidgets')]: {
          type: 'operation',
          output: ref('ListWidgetsOutput'),
          traits: { 'smithy.api#http': { method: 'GET', uri: '/widgets', code: 200 } },
        },
        [id('ListWidgetsOutput')]: {
          type: 'structure',
          members: { names: { target: id('Names') } },
        },
        [id('Names')]: { type: 'list', member: ref('smithy.api#String') },
      },
    };
    const { fetch, calls } = createEmulatorFetch({ specs: [restJson] });

    const response = await fetch('https://widgets.us-east-1.amazonaws.com/widgets');

    expect(await response.json()).toEqual({ names: ['string'] });
    expect(calls[0]).toMatchObject({ operation: 'ListWidgets', status: 200 });
  });
});

describe('AWS JSON services: mixins', () => {
  // The JSON AST doesn't repeat a mixin's members in the shape that uses it.
  const mixed: SmithyModel = {
    smithy: '2.0',
    shapes: {
      [id('Metrics_20240101')]: {
        type: 'service',
        version: '2024-01-01',
        operations: [ref('ListMetrics')],
        traits: {
          'aws.api#service': { sdkId: 'Metrics', endpointPrefix: 'metrics' },
          'aws.auth#sigv4': { name: 'metrics' },
          'aws.protocols#awsJson1_0': {},
        },
      },
      [id('ListMetrics')]: {
        type: 'operation',
        input: ref('ListMetricsInput'),
        output: ref('ListMetricsOutput'),
      },
      [id('PagingMixin')]: {
        type: 'structure',
        members: {
          NextToken: { target: 'smithy.api#String', traits: required },
          Limit: { target: 'smithy.api#Integer' },
        },
        traits: { 'smithy.api#mixin': {} },
      },
      [id('ListMetricsInput')]: {
        type: 'structure',
        mixins: [ref('PagingMixin')],
        // An own member overrides the mixin's, and adds traits to it.
        members: {
          Filter: { target: 'smithy.api#String' },
          Limit: { target: 'smithy.api#Long' },
          NextToken: {
            target: 'smithy.api#String',
            traits: { 'smithy.api#documentation': 'Where the last page ended.' },
          },
        },
      },
      [id('ListMetricsOutput')]: {
        type: 'structure',
        mixins: [ref('PagingMixin')],
        members: {},
      },
    },
  };

  it('includes the members of a shape from its mixins, which its own members override', () => {
    const { schemas } = createAwsJsonService(mixed).document.components as {
      schemas: Record<string, { properties: Record<string, unknown>; required?: string[] }>;
    };

    expect(Object.keys(schemas.ListMetricsRequestContent.properties).sort()).toEqual([
      'Filter',
      'Limit',
      'NextToken',
    ]);
    expect(schemas.ListMetricsRequestContent.properties.Limit).toMatchObject({ type: 'integer' });
    expect(schemas.ListMetricsRequestContent.required).toEqual(['NextToken']);
    expect(schemas.ListMetricsRequestContent.properties.NextToken).toMatchObject({
      description: 'Where the last page ended.',
    });
    expect(Object.keys(schemas.ListMetricsResponseContent.properties).sort()).toEqual([
      'Limit',
      'NextToken',
    ]);
  });

  it('validates requests against the inherited required members', async () => {
    const { fetch } = createEmulatorFetch({ specs: [mixed] });
    const send = (body: unknown) =>
      fetch('https://metrics.eu-west-1.amazonaws.com/', {
        method: 'POST',
        headers: {
          authorization: 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20240101/eu-west-1/metrics',
          'content-type': 'application/x-amz-json-1.0',
          'x-amz-target': 'Metrics_20240101.ListMetrics',
        },
        body: JSON.stringify(body),
      });

    expect((await send({ Filter: 'cpu' })).status).toBe(400);
    expect((await send({ NextToken: 't' })).status).toBe(200);
  });
});

describe('AWS JSON services: nulls', () => {
  const sparse: SmithyModel = {
    smithy: '2.0',
    shapes: {
      [id('Metrics_20240101')]: {
        type: 'service',
        version: '2024-01-01',
        operations: [ref('PutTags')],
        traits: {
          'aws.api#service': { sdkId: 'Metrics', endpointPrefix: 'metrics' },
          'aws.auth#sigv4': { name: 'metrics' },
          'aws.protocols#awsJson1_0': {},
        },
      },
      [id('PutTags')]: { type: 'operation', input: ref('PutTagsInput') },
      [id('PutTagsInput')]: {
        type: 'structure',
        members: {
          Name: { target: 'smithy.api#String', traits: required },
          Tags: { target: id('Tags'), traits: { 'smithy.api#length': { min: 1 } } },
          Detail: { target: id('Detail') },
        },
      },
      [id('Tags')]: {
        type: 'map',
        key: ref('smithy.api#String'),
        value: ref('smithy.api#String'),
        traits: { 'smithy.api#sparse': {} },
      },
      [id('Detail')]: {
        type: 'structure',
        members: { Note: { target: 'smithy.api#String' } },
      },
    },
  };

  const send = async (body: unknown) => {
    const { fetch, calls } = createEmulatorFetch({ specs: [sparse] });
    const response = await fetch('https://metrics.eu-west-1.amazonaws.com/', {
      method: 'POST',
      headers: {
        authorization: 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20240101/eu-west-1/metrics',
        'content-type': 'application/x-amz-json-1.0',
        'x-amz-target': 'Metrics_20240101.PutTags',
      },
      body: JSON.stringify(body),
    });
    return { response, calls };
  };

  it('keeps the nulls of sparse maps, which count towards their length', async () => {
    const { response } = await send({ Name: 'n', Tags: { owner: null } });

    expect(response.status).toBe(200);
  });

  it('drops null structure members as absent, so a null required member is missing', async () => {
    const optional = await send({ Name: 'n', Detail: { Note: null }, Tags: { a: 'b' } });
    const missing = await send({ Name: null });

    expect(optional.response.status).toBe(200);
    expect(missing.response.status).toBe(400);
  });
});
