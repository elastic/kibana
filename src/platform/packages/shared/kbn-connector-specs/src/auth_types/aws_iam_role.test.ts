/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios, { AxiosHeaders } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { AuthContext } from '../connector_spec';
import { AwsIamRoleAuth } from './aws_iam_role';

// The jest environment has no Web Crypto. The digest echoes its input so that distinct inputs still
// produce distinct cache keys, and the signature primitive is faked.
jest.mock('./aws_crypto_helpers', () => ({
  sha256Hash: jest.fn(async (message: string) => `digest:${message}`),
  calculateAWSA4Signature: jest.fn(async () => 'bb'.repeat(32)),
}));

const ROLE_ARN = 'arn:aws:iam::123456789012:role/KibanaDynamoDb';
const DYNAMODB_URL = 'https://dynamodb.us-east-1.amazonaws.com/';

const stsSuccess = (expiration: string = '2999-01-01T00:00:00Z') => ({
  data: `<AssumeRoleResponse><AssumeRoleResult><Credentials>
    <AccessKeyId>ASIATEMPORARY</AccessKeyId>
    <SecretAccessKey>temporary-secret</SecretAccessKey>
    <SessionToken>temporary-session-token</SessionToken>
    <Expiration>${expiration}</Expiration>
  </Credentials></AssumeRoleResult></AssumeRoleResponse>`,
});

const stsFailure = (status: number, code: string, message: string) => ({
  response: {
    status,
    data: `<ErrorResponse><Error><Type>Sender</Type><Code>${code}</Code><Message>${message}</Message></Error></ErrorResponse>`,
  },
});

type RequestInterceptor = (
  config: InternalAxiosRequestConfig
) => Promise<InternalAxiosRequestConfig>;

describe('AwsIamRoleAuth', () => {
  const mockStsPost = jest.fn();
  let uniqueId = 0;

  // The credential cache is module-level, so every test uses its own access key id unless it is
  // exercising the cache on purpose.
  const makeSecret = (overrides: Record<string, unknown> = {}) => ({
    accessKeyId: `AKIATEST${uniqueId++}`,
    secretAccessKey: 'base-secret',
    roleArn: ROLE_ARN,
    roleSessionName: 'kibana-connector',
    ...overrides,
  });

  const getInterceptor = async (secret: ReturnType<typeof makeSecret>) => {
    let interceptor: RequestInterceptor | undefined;
    const axiosInstance = {
      defaults: {},
      interceptors: {
        request: {
          use: (fn: RequestInterceptor) => {
            interceptor = fn;
          },
        },
      },
    } as unknown as AxiosInstance;

    await AwsIamRoleAuth.configure({} as AuthContext, axiosInstance, secret);
    if (!interceptor) {
      throw new Error('AwsIamRoleAuth did not register a request interceptor');
    }
    return interceptor;
  };

  const makeRequest = (url: string = DYNAMODB_URL) =>
    ({
      url,
      method: 'post',
      data: '{}',
      headers: new AxiosHeaders({ 'Content-Type': 'application/x-amz-json-1.0' }),
    } as unknown as InternalAxiosRequestConfig);

  beforeEach(() => {
    jest.clearAllMocks();
    mockStsPost.mockResolvedValue(stsSuccess());
    jest.spyOn(axios, 'create').mockReturnValue({ post: mockStsPost } as unknown as AxiosInstance);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('signing', () => {
    it('signs AWS requests with the temporary credentials and session token', async () => {
      const interceptor = await getInterceptor(makeSecret());

      const signed = await interceptor(makeRequest());

      expect(signed.headers.get('Authorization')).toContain('Credential=ASIATEMPORARY/');
      expect(signed.headers.get('X-Amz-Security-Token')).toBe('temporary-session-token');
    });

    it('never follows a redirect for a request that carries the session token', async () => {
      const interceptor = await getInterceptor(makeSecret());

      const signed = await interceptor(makeRequest());

      expect(signed.maxRedirects).toBe(0);
    });

    it('leaves non-AWS hosts untouched and does not call STS', async () => {
      const interceptor = await getInterceptor(makeSecret());

      const config = await interceptor(makeRequest('https://example.com/foo'));

      expect(config.headers.get('Authorization')).toBeUndefined();
      expect(config.headers.get('X-Amz-Security-Token')).toBeUndefined();
      expect(mockStsPost).not.toHaveBeenCalled();
    });
  });

  describe('AssumeRole request', () => {
    it('asks STS for the role with the default session name and without an external id', async () => {
      const interceptor = await getInterceptor(makeSecret({ roleSessionName: undefined }));

      await interceptor(makeRequest());

      const [url, body, options] = mockStsPost.mock.calls[0];
      expect(url).toBe('https://sts.us-east-1.amazonaws.com/');
      expect(body).toContain('Action=AssumeRole');
      expect(body).toContain(`RoleArn=${encodeURIComponent(ROLE_ARN)}`);
      expect(body).toContain('RoleSessionName=kibana-connector');
      expect(body).not.toContain('ExternalId');
      expect(options.maxRedirects).toBe(0);
    });

    it('sends the external id and a custom session name, percent-encoded', async () => {
      const interceptor = await getInterceptor(
        makeSecret({ externalId: 'ext/id+1', roleSessionName: 'session@example' })
      );

      await interceptor(makeRequest());

      const [, body] = mockStsPost.mock.calls[0];
      expect(body).toContain(`ExternalId=${encodeURIComponent('ext/id+1')}`);
      expect(body).toContain(`RoleSessionName=${encodeURIComponent('session@example')}`);
    });

    it.each([
      ['us-east-1', 'https://dynamodb.us-east-1.amazonaws.com/'],
      ['af-south-1', 'https://dynamodb.af-south-1.amazonaws.com/'],
      ['us-gov-west-1', 'https://dynamodb.us-gov-west-1.amazonaws.com/'],
    ])('calls the regional STS endpoint and signs for %s', async (region, requestUrl) => {
      const interceptor = await getInterceptor(makeSecret());

      await interceptor(makeRequest(requestUrl));

      const [url, , options] = mockStsPost.mock.calls[0];
      expect(url).toBe(`https://sts.${region}.amazonaws.com/`);
      expect(options.headers.Authorization).toContain(`/${region}/sts/aws4_request`);
    });

    it('does not send the base credentials to a host built from a malformed Region', async () => {
      const interceptor = await getInterceptor(makeSecret());

      await expect(
        interceptor(makeRequest('https://dynamodb.bad_region.amazonaws.com/'))
      ).rejects.toThrow('not a valid AWS Region');
      expect(mockStsPost).not.toHaveBeenCalled();
    });

    it('does not put the base secret access key in the request body', async () => {
      const interceptor = await getInterceptor(makeSecret({ secretAccessKey: 'do-not-leak-me' }));

      await interceptor(makeRequest());

      expect(mockStsPost.mock.calls[0][1]).not.toContain('do-not-leak-me');
    });
  });

  describe('credential cache', () => {
    it('reuses cached credentials across requests', async () => {
      const interceptor = await getInterceptor(makeSecret());

      await interceptor(makeRequest());
      await interceptor(makeRequest());

      expect(mockStsPost).toHaveBeenCalledTimes(1);
    });

    it('shares credentials between connectors that have identical settings', async () => {
      const secret = makeSecret();
      const first = await getInterceptor(secret);
      const second = await getInterceptor({ ...secret });

      await first(makeRequest());
      await second(makeRequest());

      expect(mockStsPost).toHaveBeenCalledTimes(1);
    });

    it('makes one AssumeRole call for concurrent requests on a cold cache', async () => {
      const interceptor = await getInterceptor(makeSecret());

      await Promise.all([interceptor(makeRequest()), interceptor(makeRequest())]);

      expect(mockStsPost).toHaveBeenCalledTimes(1);
    });

    it('does not share credentials between Regions', async () => {
      const interceptor = await getInterceptor(makeSecret());

      await interceptor(makeRequest('https://dynamodb.us-east-1.amazonaws.com/'));
      await interceptor(makeRequest('https://dynamodb.eu-west-1.amazonaws.com/'));

      expect(mockStsPost).toHaveBeenCalledTimes(2);
    });

    it('lets the next request retry after a concurrent AssumeRole failed', async () => {
      const interceptor = await getInterceptor(makeSecret());
      mockStsPost.mockRejectedValueOnce(stsFailure(403, 'AccessDenied', 'denied'));

      const results = await Promise.allSettled([
        interceptor(makeRequest()),
        interceptor(makeRequest()),
      ]);
      await interceptor(makeRequest());

      expect(results.map(({ status }) => status)).toEqual(['rejected', 'rejected']);
      expect(mockStsPost).toHaveBeenCalledTimes(2);
    });

    it('refreshes credentials that are close to expiring', async () => {
      mockStsPost.mockResolvedValue(stsSuccess(new Date(Date.now() + 60_000).toISOString()));
      const interceptor = await getInterceptor(makeSecret());

      await interceptor(makeRequest());
      await interceptor(makeRequest());

      expect(mockStsPost).toHaveBeenCalledTimes(2);
    });

    it('does not serve one connector the credentials another got with a different secret', async () => {
      // Same access key id and role ARN, so a key built from those two alone would collide.
      const accessKeyId = 'AKIASHAREDKEYID';
      const legitimate = await getInterceptor(makeSecret({ accessKeyId }));
      const impostor = await getInterceptor(
        makeSecret({ accessKeyId, secretAccessKey: 'wrong-secret' })
      );

      await legitimate(makeRequest());
      mockStsPost.mockRejectedValueOnce(
        stsFailure(
          403,
          'SignatureDoesNotMatch',
          'The request signature we calculated does not match'
        )
      );

      await expect(impostor(makeRequest())).rejects.toThrow(
        'AWS STS AssumeRole failed [SignatureDoesNotMatch]'
      );
      expect(mockStsPost).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['external id', { externalId: 'other-external-id' }],
      ['session name', { roleSessionName: 'other-session' }],
      ['role ARN', { roleArn: 'arn:aws:iam::123456789012:role/OtherRole' }],
    ])('does not share credentials between connectors with a different %s', async (_, change) => {
      const accessKeyId = `AKIADIFFERENT${uniqueId++}`;
      const first = await getInterceptor(makeSecret({ accessKeyId, externalId: 'external-id' }));
      const second = await getInterceptor(
        makeSecret({ accessKeyId, externalId: 'external-id', ...change })
      );

      await first(makeRequest());
      await second(makeRequest());

      expect(mockStsPost).toHaveBeenCalledTimes(2);
    });

    it('bounds the cache and evicts the oldest entry first', async () => {
      const [firstSecret, ...others] = Array.from({ length: 101 }, () => makeSecret());
      const first = await getInterceptor(firstSecret);
      await first(makeRequest());
      for (const secret of others) {
        await (
          await getInterceptor(secret)
        )(makeRequest());
      }
      expect(mockStsPost).toHaveBeenCalledTimes(101);

      await first(makeRequest());

      expect(mockStsPost).toHaveBeenCalledTimes(102);
    });
  });

  describe('STS errors', () => {
    it('names AssumeRole and the STS error code and message', async () => {
      mockStsPost.mockRejectedValue(
        stsFailure(403, 'AccessDenied', 'User is not authorized to perform: sts:AssumeRole')
      );
      const interceptor = await getInterceptor(makeSecret());

      await expect(interceptor(makeRequest())).rejects.toThrow(
        'AWS STS AssumeRole failed [AccessDenied]: User is not authorized to perform: sts:AssumeRole'
      );
    });

    it('reports the HTTP status when STS returns no error document', async () => {
      mockStsPost.mockRejectedValue({ response: { status: 302, data: '' } });
      const interceptor = await getInterceptor(makeSecret());

      await expect(interceptor(makeRequest())).rejects.toThrow(
        'AWS STS AssumeRole failed: HTTP 302'
      );
    });

    it('reports the transport error when STS cannot be reached', async () => {
      mockStsPost.mockRejectedValue(new Error('getaddrinfo ENOTFOUND sts.amazonaws.com'));
      const interceptor = await getInterceptor(makeSecret());

      await expect(interceptor(makeRequest())).rejects.toThrow(
        'AWS STS AssumeRole failed: getaddrinfo ENOTFOUND sts.amazonaws.com'
      );
    });

    it('rejects a response without credentials', async () => {
      mockStsPost.mockResolvedValue({ data: '<AssumeRoleResponse></AssumeRoleResponse>' });
      const interceptor = await getInterceptor(makeSecret());

      await expect(interceptor(makeRequest())).rejects.toThrow(
        'AWS STS AssumeRole returned an unexpected response'
      );
    });

    it('does not cache a failed AssumeRole', async () => {
      mockStsPost.mockRejectedValueOnce(stsFailure(403, 'AccessDenied', 'denied'));
      const interceptor = await getInterceptor(makeSecret());

      await expect(interceptor(makeRequest())).rejects.toThrow('AccessDenied');
      await interceptor(makeRequest());

      expect(mockStsPost).toHaveBeenCalledTimes(2);
    });
  });

  describe('schema', () => {
    const parse = (value: Record<string, unknown>) =>
      AwsIamRoleAuth.schema.safeParse({
        accessKeyId: 'AKIAEXAMPLE',
        secretAccessKey: 'secret',
        roleArn: ROLE_ARN,
        ...value,
      });

    it('defaults the session name', () => {
      const result = parse({});

      expect(result.success).toBe(true);
      expect(result.data?.roleSessionName).toBe('kibana-connector');
    });

    it.each([
      'arn:aws:iam::123456789012:role/MyRole',
      'arn:aws:iam::123456789012:role/service-role/My_Role+=,.@-',
      'arn:aws-us-gov:iam::123456789012:role/GovRole',
    ])('accepts the role ARN %s', (roleArn) => {
      expect(parse({ roleArn }).success).toBe(true);
    });

    it.each([
      '',
      'MyRole',
      'arn:aws:iam::12345:role/MyRole',
      'arn:aws:iam::123456789012:user/MyUser',
      'arn:aws-cn:iam::123456789012:role/CnRole',
      'arn:aws:iam::123456789012:role/',
      'arn:aws:iam::123456789012:role/My Role',
      `arn:aws:iam::123456789012:role/${'a'.repeat(2048)}`,
    ])('rejects the role ARN %j', (roleArn) => {
      expect(parse({ roleArn }).success).toBe(false);
    });

    it.each([
      [{ externalId: 'partner-123' }, true],
      [{ externalId: 'a/b:c=d,e.f@g+h_i-j' }, true],
      [{ externalId: '' }, true],
      [{ externalId: 'has space' }, false],
      [{ externalId: 'x'.repeat(1225) }, false],
      [{ roleSessionName: 'session@example.com' }, true],
      [{ roleSessionName: 'x'.repeat(64) }, true],
      [{ roleSessionName: 'x'.repeat(65) }, false],
      [{ roleSessionName: 'has space' }, false],
      [{ roleSessionName: 'slash/not-allowed' }, false],
    ])('validates %j as %s', (value, valid) => {
      expect(parse(value).success).toBe(valid);
    });
  });
});
