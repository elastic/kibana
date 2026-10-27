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
import type { SmithyModel } from '.';
import { convertSmithy, isSmithyModel } from '.';

const NS = 'example.storage';
const id = (name: string) => `${NS}#${name}`;
const ref = (name: string) => ({ target: name.includes('#') ? name : id(name) });
const required = { 'smithy.api#required': {} };

// A restJson1 service modeled like AWS's: an operation on the service, operations on a
// resource and a child resource, and shapes that use each trait the converter maps.
const model: SmithyModel = {
  smithy: '2.0',
  shapes: {
    [id('Storage')]: {
      type: 'service',
      version: '2024-01-01',
      operations: [ref('ListBuckets'), ref('WatchBucket')],
      resources: [ref('Bucket')],
      errors: [ref('ThrottlingException')],
      traits: {
        'aws.api#service': { sdkId: 'Storage', endpointPrefix: 'storage' },
        'aws.auth#sigv4': { name: 'storage' },
        'aws.protocols#restJson1': {},
        'smithy.api#title': 'Example Storage',
      },
    },
    [id('Bucket')]: {
      type: 'resource',
      read: ref('GetBucket'),
      operations: [ref('PutObject'), ref('FindBucket')],
      resources: [ref('Object')],
    },
    [id('Object')]: { type: 'resource', read: ref('GetObject') },
    [id('ListBuckets')]: {
      type: 'operation',
      input: ref('ListBucketsInput'),
      output: ref('ListBucketsOutput'),
      traits: {
        'smithy.api#http': { method: 'GET', uri: '/buckets', code: 200 },
        'smithy.api#auth': [],
      },
    },
    [id('ListBucketsInput')]: {
      type: 'structure',
      members: {
        maxResults: { target: id('MaxResults'), traits: { 'smithy.api#httpQuery': 'max-results' } },
        states: { target: id('StateList'), traits: { 'smithy.api#httpQuery': 'state' } },
        since: { target: 'smithy.api#Timestamp', traits: { 'smithy.api#httpQuery': 'since' } },
        labels: { target: id('Labels'), traits: { 'smithy.api#httpQueryParams': {} } },
      },
    },
    [id('Labels')]: { type: 'map', key: ref('smithy.api#String'), value: ref('smithy.api#String') },
    [id('ListBucketsOutput')]: {
      type: 'structure',
      members: {
        buckets: { target: id('BucketList') },
        nextToken: { target: 'smithy.api#String', traits: { 'smithy.api#jsonName': 'NextToken' } },
      },
    },
    [id('GetBucket')]: {
      type: 'operation',
      input: ref('GetBucketInput'),
      output: ref('GetBucketOutput'),
      errors: [ref('NotFoundException'), ref('GoneException')],
      traits: { 'smithy.api#http': { method: 'GET', uri: '/buckets/{name}', code: 200 } },
    },
    [id('GetBucketInput')]: {
      type: 'structure',
      members: {
        name: { target: id('BucketName'), traits: { ...required, 'smithy.api#httpLabel': {} } },
        ifModifiedSince: {
          target: 'smithy.api#Timestamp',
          traits: { 'smithy.api#httpHeader': 'If-Modified-Since' },
        },
      },
    },
    [id('GetBucketOutput')]: {
      type: 'structure',
      members: {
        bucket: { target: id('BucketDetail'), traits: required },
        requestId: {
          target: 'smithy.api#String',
          traits: { ...required, 'smithy.api#httpHeader': 'x-request-id' },
        },
      },
    },
    [id('FindBucket')]: {
      type: 'operation',
      input: ref('GetBucketInput'),
      output: ref('GetBucketOutput'),
      traits: {
        'smithy.api#http': { method: 'GET', uri: '/buckets/{name}?find=Bucket', code: 200 },
      },
    },
    [id('PutObject')]: {
      type: 'operation',
      input: ref('PutObjectInput'),
      output: ref('smithy.api#Unit'),
      traits: {
        'smithy.api#http': { method: 'PUT', uri: '/buckets/{name}/objects/{key+}', code: 201 },
      },
    },
    [id('PutObjectInput')]: {
      type: 'structure',
      members: {
        name: { target: id('BucketName'), traits: { ...required, 'smithy.api#httpLabel': {} } },
        key: { target: 'smithy.api#String', traits: { ...required, 'smithy.api#httpLabel': {} } },
        body: { target: id('Body'), traits: { ...required, 'smithy.api#httpPayload': {} } },
      },
    },
    [id('GetObject')]: {
      type: 'operation',
      input: ref('GetObjectInput'),
      output: ref('GetObjectOutput'),
      traits: {
        'smithy.api#http': { method: 'GET', uri: '/buckets/{name}/objects/{key+}', code: 200 },
      },
    },
    [id('GetObjectInput')]: {
      type: 'structure',
      members: {
        name: { target: id('BucketName'), traits: { ...required, 'smithy.api#httpLabel': {} } },
        key: { target: 'smithy.api#String', traits: { ...required, 'smithy.api#httpLabel': {} } },
      },
    },
    [id('GetObjectOutput')]: {
      type: 'structure',
      members: {
        metadata: { target: id('ObjectMetadata'), traits: { 'smithy.api#httpPayload': {} } },
        status: { target: 'smithy.api#Integer', traits: { 'smithy.api#httpResponseCode': {} } },
      },
    },
    [id('ObjectMetadata')]: {
      type: 'structure',
      members: { size: { target: 'smithy.api#Long', traits: required } },
    },
    [id('Body')]: { type: 'blob', traits: { 'smithy.api#mediaType': 'application/json' } },
    [id('BucketName')]: {
      type: 'string',
      traits: { 'smithy.api#length': { min: 3, max: 63 }, 'smithy.api#pattern': '^[a-z0-9-]+$' },
    },
    [id('MaxResults')]: { type: 'integer', traits: { 'smithy.api#range': { min: 1, max: 100 } } },
    [id('StateList')]: { type: 'list', member: ref('State') },
    [id('State')]: {
      type: 'enum',
      members: {
        ACTIVE: { target: 'smithy.api#Unit', traits: { 'smithy.api#enumValue': 'active' } },
        DELETING: { target: 'smithy.api#Unit', traits: { 'smithy.api#enumValue': 'deleting' } },
      },
    },
    [id('Tier')]: {
      type: 'intEnum',
      members: {
        HOT: { target: 'smithy.api#Unit', traits: { 'smithy.api#enumValue': 1 } },
        COLD: { target: 'smithy.api#Unit', traits: { 'smithy.api#enumValue': 2 } },
      },
    },
    [id('BucketList')]: { type: 'list', member: ref('BucketDetail') },
    [id('BucketDetail')]: {
      type: 'structure',
      traits: { 'smithy.api#documentation': 'A bucket.' },
      members: {
        name: { target: id('BucketName'), traits: required },
        createdAt: { target: 'smithy.api#Timestamp' },
        expiresAt: {
          target: 'smithy.api#Timestamp',
          traits: { 'smithy.api#timestampFormat': 'date-time' },
        },
        tier: { target: id('Tier'), traits: { ...required, 'smithy.api#clientOptional': {} } },
        versioned: {
          target: 'smithy.api#Boolean',
          traits: { 'smithy.api#default': false, 'smithy.api#documentation': 'Keeps versions.' },
        },
        tags: { target: id('Tags') },
        checksum: { target: id('Checksum') },
        snapshots: { target: id('Snapshots') },
        policy: { target: 'smithy.api#Document' },
        replication: { target: id('Replication') },
        parent: { target: id('BucketDetail') },
        ratio: { target: 'smithy.api#Double', traits: { 'smithy.api#deprecated': {} } },
        accessKey: { target: id('Secret') },
      },
    },
    [id('Secret')]: { type: 'string', traits: { 'smithy.api#sensitive': {} } },
    [id('Checksum')]: { type: 'blob', traits: { 'smithy.api#length': { min: 1, max: 1 } } },
    [id('Snapshots')]: {
      type: 'list',
      member: ref('ObjectMetadata'),
      traits: { 'smithy.api#sparse': {} },
    },
    [id('WatchBucket')]: {
      type: 'operation',
      input: ref('GetBucketInput'),
      output: ref('WatchBucketOutput'),
      traits: { 'smithy.api#http': { method: 'GET', uri: '/buckets/{name}/events', code: 200 } },
    },
    [id('WatchBucketOutput')]: {
      type: 'structure',
      members: { events: { target: id('BucketEvents'), traits: { 'smithy.api#httpPayload': {} } } },
    },
    [id('BucketEvents')]: {
      type: 'union',
      traits: { 'smithy.api#streaming': {} },
      members: { created: { target: id('ObjectMetadata') } },
    },
    [id('Tags')]: {
      type: 'map',
      key: ref('smithy.api#String'),
      value: ref('smithy.api#String'),
      traits: { 'smithy.api#length': { min: 1, max: 50 }, 'smithy.api#sparse': {} },
    },
    [id('Replication')]: {
      type: 'union',
      members: {
        region: { target: 'smithy.api#String' },
        disabled: { target: 'smithy.api#Boolean' },
      },
    },
    [id('NotFoundException')]: {
      type: 'structure',
      members: {
        message: { target: 'smithy.api#String' },
        errorId: {
          target: 'smithy.api#String',
          traits: { ...required, 'smithy.api#httpHeader': 'x-error-id' },
        },
      },
      traits: { 'smithy.api#error': 'client', 'smithy.api#httpError': 404 },
    },
    [id('GoneException')]: {
      type: 'structure',
      members: { message: { target: 'smithy.api#String' } },
      traits: { 'smithy.api#error': 'client', 'smithy.api#httpError': 404 },
    },
    [id('ThrottlingException')]: {
      type: 'structure',
      members: {
        message: { target: 'smithy.api#String' },
        retryAfter: {
          target: 'smithy.api#String',
          traits: { 'smithy.api#httpHeader': 'Retry-After' },
        },
      },
      traits: { 'smithy.api#error': 'client' },
    },
  },
};

type Paths = Record<string, Record<string, Record<string, unknown>>>;

describe('convertSmithy', () => {
  const document = convertSmithy(model);
  const paths = document.paths as Paths;
  const schemas = (document.components as { schemas: Record<string, unknown> }).schemas;

  it('recognizes Smithy models', () => {
    expect(isSmithyModel(model)).toBe(true);
    expect(isSmithyModel({ openapi: '3.0.3', paths: {} })).toBe(false);
  });

  it('describes the service, its regional endpoint and SigV4 authentication', () => {
    expect(document).toMatchObject({
      openapi: '3.0.3',
      info: { title: 'Example Storage', version: '2024-01-01' },
      servers: [
        {
          url: 'https://storage.{region}.amazonaws.com',
          variables: { region: { default: 'us-east-1' } },
        },
      ],
      security: [{ 'aws.auth.sigv4': [] }],
      components: {
        securitySchemes: {
          'aws.auth.sigv4': { type: 'apiKey', in: 'header', name: 'Authorization' },
        },
      },
    });
    expect(paths['/buckets'].get.security).toEqual([]);
  });

  it('converts the operations of the service and of its resources', () => {
    expect(
      Object.entries(paths).flatMap(([path, item]) =>
        Object.entries(item).map(
          ([method, operation]) => `${method} ${path} ${operation.operationId}`
        )
      )
    ).toEqual([
      'get /buckets ListBuckets',
      'get /buckets/{name}/events WatchBucket',
      'put /buckets/{name}/objects/{key} PutObject',
      'get /buckets/{name}/objects/{key} GetObject',
      'get /buckets/{name} GetBucket',
    ]);
    // A URI with a fixed query parameter goes under `x-ms-paths`.
    expect(Object.keys(document['x-ms-paths'] as object)).toEqual(['/buckets/{name}?find=Bucket']);
  });

  it('binds members to query parameters, path labels and headers, with their timestamp formats', () => {
    expect(paths['/buckets'].get.parameters).toEqual([
      {
        name: 'max-results',
        in: 'query',
        required: false,
        schema: { type: 'integer', format: 'int32', minimum: 1, maximum: 100 },
      },
      {
        name: 'state',
        in: 'query',
        required: false,
        schema: { type: 'array', items: { $ref: '#/components/schemas/State' } },
      },
      {
        name: 'since',
        in: 'query',
        required: false,
        schema: { type: 'string', format: 'date-time' },
      },
      {
        name: 'labels',
        in: 'query',
        required: false,
        schema: { type: 'object', additionalProperties: { type: 'string' } },
        style: 'form',
        explode: true,
      },
    ]);
    expect(paths['/buckets/{name}'].get.parameters).toEqual([
      {
        name: 'name',
        in: 'path',
        required: true,
        schema: { type: 'string', minLength: 3, maxLength: 63, pattern: '^[a-z0-9-]+$' },
      },
      { name: 'If-Modified-Since', in: 'header', required: false, schema: { type: 'string' } },
    ]);
    expect(paths['/buckets/{name}/objects/{key}'].put.parameters).toContainEqual({
      name: 'key',
      in: 'path',
      required: true,
      schema: { type: 'string' },
      'x-ms-skip-url-encoding': true,
    });
  });

  it('converts payloads, bodies, response headers and status codes', () => {
    expect(paths['/buckets/{name}/objects/{key}'].put).toMatchObject({
      requestBody: {
        required: true,
        // A JSON body is parsed before validation, so its blob schema takes any value.
        content: { 'application/json': { schema: {} } },
      },
      responses: { '201': { description: 'PutObject 201 response' } },
    });
    // The `@httpResponseCode` member sets the status.
    expect(paths['/buckets/{name}/objects/{key}'].get.responses).toEqual({
      '2XX': {
        description: 'GetObject 2XX response',
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/ObjectMetadata' } },
        },
      },
      '400': expect.anything(),
    });
    expect(paths['/buckets/{name}/events'].get.responses).toMatchObject({
      '200': {
        content: {
          'application/vnd.amazon.eventstream': { schema: { type: 'string', format: 'binary' } },
        },
      },
    });
    expect(paths['/buckets/{name}'].get.responses).toMatchObject({
      '200': {
        headers: { 'x-request-id': { required: true, schema: { type: 'string' } } },
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/GetBucketResponseContent' } },
        },
      },
    });
    expect(schemas.GetBucketResponseContent).toEqual({
      type: 'object',
      properties: { bucket: { $ref: '#/components/schemas/BucketDetail' } },
      required: ['bucket'],
    });
    expect(schemas.ListBucketsResponseContent).toEqual({
      type: 'object',
      properties: {
        buckets: { type: 'array', items: { $ref: '#/components/schemas/BucketDetail' } },
        NextToken: { type: 'string' },
      },
    });
  });

  it('answers modeled errors at their status, with the service errors', () => {
    expect(paths['/buckets/{name}'].get.responses).toMatchObject({
      '404': {
        description: 'NotFoundException, GoneException 404 response',
        // Only one of the alternatives defines the header, so it isn't mandatory.
        headers: { 'x-error-id': { required: false, schema: { type: 'string' } } },
        content: {
          'application/json': {
            schema: {
              anyOf: [
                { $ref: '#/components/schemas/NotFoundExceptionResponseContent' },
                { $ref: '#/components/schemas/GoneExceptionResponseContent' },
              ],
            },
          },
        },
      },
      '400': {
        description: 'ThrottlingException 400 response',
        headers: { 'Retry-After': { required: false, schema: { type: 'string' } } },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ThrottlingExceptionResponseContent' },
          },
        },
      },
    });
  });

  it('maps shapes and their constraints to schemas', () => {
    expect(schemas.BucketDetail).toEqual({
      type: 'object',
      description: 'A bucket.',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 3, maxLength: 63, pattern: '^[a-z0-9-]+$' },
        // restJson1 documents carry timestamps as epoch seconds unless the member says otherwise.
        createdAt: { type: 'number', format: 'double' },
        expiresAt: { type: 'string', format: 'date-time' },
        tier: { $ref: '#/components/schemas/Tier' },
        versioned: { type: 'boolean', default: false, description: 'Keeps versions.' },
        tags: {
          type: 'object',
          additionalProperties: { type: 'string', nullable: true },
          minProperties: 1,
          maxProperties: 50,
        },
        // `@length` counts bytes; one byte is four base64 characters.
        checksum: { type: 'string', format: 'byte', minLength: 4, maxLength: 4 },
        snapshots: {
          type: 'array',
          items: { allOf: [{ $ref: '#/components/schemas/ObjectMetadata' }], nullable: true },
        },
        policy: {},
        replication: { $ref: '#/components/schemas/Replication' },
        parent: { $ref: '#/components/schemas/BucketDetail' },
        ratio: { type: 'number', format: 'double', deprecated: true },
        accessKey: { type: 'string', format: 'password' },
      },
    });
    expect(schemas.State).toEqual({ type: 'string', enum: ['active', 'deleting'] });
    expect(schemas.Tier).toEqual({ type: 'integer', enum: [1, 2] });
    expect(schemas.Replication).toEqual({
      oneOf: [
        { type: 'object', properties: { region: { type: 'string' } }, required: ['region'] },
        { type: 'object', properties: { disabled: { type: 'boolean' } }, required: ['disabled'] },
      ],
    });
  });

  it('serves the converted operations, with greedy labels spanning segments', async () => {
    const { fetch, calls } = createEmulatorFetch({ specs: [document] });
    const authorization =
      'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20240101/eu-west-1/storage/aws4_request';

    const object = await fetch(
      'https://storage.eu-west-1.amazonaws.com/buckets/logs/objects/2024/01/app.log',
      {
        headers: { authorization },
      }
    );
    const unsigned = await fetch('https://storage.eu-west-1.amazonaws.com/buckets/logs');
    const invalid = await fetch('https://storage.eu-west-1.amazonaws.com/buckets/Logs!', {
      headers: { authorization },
    });

    expect(object.status).toBe(200);
    expect(await object.json()).toEqual({ size: 0 });
    expect(unsigned.status).toBe(401);
    expect(invalid.status).toBe(422);
    expect(calls.map(({ operation }) => operation)).toEqual([
      'GetObject',
      'GetBucket',
      'GetBucket',
    ]);
  });

  it('accepts an error body that fits several errors of its status', async () => {
    const { fetch, calls, rejectedResponses } = createEmulatorFetch({
      specs: [document],
      fixtures: [
        {
          operation: { method: 'get', path: '/buckets/{name}' },
          response: { status: 404, body: { message: 'No such bucket' } },
        },
      ],
    });

    const response = await fetch('https://storage.eu-west-1.amazonaws.com/buckets/logs', {
      headers: { authorization: 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE' },
    });

    expect(response.status).toBe(404);
    expect(rejectedResponses).toEqual([]);
    expect(calls[0].responseViolations).toEqual([]);
  });

  it('reads `@httpQueryParams` maps from the query keys no other member binds', async () => {
    const { fetch, calls } = createEmulatorFetch({ specs: [document] });

    const response = await fetch(
      'https://storage.eu-west-1.amazonaws.com/buckets?max-results=5&env=prod&team=core'
    );
    const invalid = await fetch(
      'https://storage.eu-west-1.amazonaws.com/buckets?max-results=500&env=prod'
    );

    expect(response.status).toBe(200);
    expect(calls[0].requestViolations).toEqual([]);
    expect(invalid.status).toBe(422);
    expect(calls[1].requestViolations).toEqual([
      expect.objectContaining({ path: ['query', 'max-results'] }),
    ]);
  });

  it('accepts nulls in sparse lists of structures and base64 blobs of their byte length', async () => {
    const { fetch, calls, rejectedResponses } = createEmulatorFetch({
      specs: [document],
      fixtures: [
        {
          operation: { method: 'get', path: '/buckets/{name}' },
          response: {
            status: 200,
            headers: { 'x-request-id': 'req-1' },
            body: { bucket: { name: 'logs', checksum: 'AA==', snapshots: [null, { size: 1 }] } },
          },
        },
      ],
    });

    const response = await fetch('https://storage.eu-west-1.amazonaws.com/buckets/logs', {
      headers: { authorization: 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE' },
    });

    expect(response.status).toBe(200);
    expect(rejectedResponses).toEqual([]);
    expect(calls[0].responseViolations).toEqual([]);
  });

  it('serves Lambda Invoke as the connector calls it, with JSON payloads and dynamic statuses', async () => {
    const lambda: unknown = JSON.parse(
      readFileSync(join(__dirname, '__fixtures__', 'smithy_openapi', 'lambda.smithy.json'), 'utf8')
    );
    if (!isSmithyModel(lambda)) {
      throw new Error('lambda.smithy.json is not a Smithy model');
    }
    const { fetch, calls, rejectedResponses } = createEmulatorFetch({
      specs: [convertSmithy(lambda)],
      fixtures: [
        {
          operation: { method: 'post', path: '/2015-03-31/functions/{FunctionName}/invocations' },
          response: { status: 202 },
        },
      ],
    });

    // As the connector sends it: a JSON payload, signed with SigV4.
    const response = await fetch(
      'https://lambda.eu-west-1.amazonaws.com/2015-03-31/functions/my-function/invocations',
      {
        method: 'POST',
        headers: {
          authorization: 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20240101/eu-west-1/lambda',
          'content-type': 'application/json',
          'x-amz-invocation-type': 'Event',
          'x-amz-log-type': 'Tail',
        },
        body: JSON.stringify({ orderId: 42 }),
      }
    );

    expect(response.status).toBe(202);
    expect(calls[0].requestViolations).toEqual([]);
    expect(calls[0].responseViolations).toEqual([]);
    expect(rejectedResponses).toEqual([]);
  });

  it('rejects services of other protocols and ambiguous models', () => {
    const service = model.shapes[id('Storage')];
    const awsJson: SmithyModel = {
      smithy: '2.0',
      shapes: {
        [id('Metrics')]: {
          ...service,
          traits: { 'aws.protocols#awsJson1_0': {}, 'aws.auth#sigv4': { name: 'monitoring' } },
        },
      },
    };
    const twoServices: SmithyModel = {
      smithy: '2.0',
      shapes: { [id('A')]: service, [id('B')]: service },
    };

    expect(() => convertSmithy(awsJson)).toThrow(
      'example.storage#Metrics uses aws.protocols#awsJson1_0; convertSmithy supports aws.protocols#restJson1'
    );
    expect(() => convertSmithy(twoServices)).toThrow(
      'Expected one service in the model, found example.storage#A, example.storage#B; pass the service to convert'
    );
    expect(convertSmithy(twoServices, { service: id('B') }).info).toMatchObject({
      version: '2024-01-01',
    });
  });
});
