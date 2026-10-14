/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import {
  buildAuthHeader,
  buildSpacePrefix,
  fetchBuildInfo,
  fetchConnectorTypes,
  validateAuthFlags,
} from './fetch';

const mockedFetch = jest.spyOn(global, 'fetch');
const log = new ToolingLog();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('buildAuthHeader', () => {
  it('prefers the api key', () => {
    expect(buildAuthHeader({ apiKey: 'abc', username: 'u', password: 'p' })).toBe('ApiKey abc');
  });

  it('builds a Basic header from username/password', () => {
    const expected = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`;
    expect(buildAuthHeader({ username: 'elastic', password: 'changeme' })).toBe(expected);
  });

  it('returns undefined when no credentials are provided', () => {
    expect(buildAuthHeader({})).toBeUndefined();
  });

  it('treats an empty password as present (basic auth) rather than missing', () => {
    const expected = `Basic ${Buffer.from('u:').toString('base64')}`;
    expect(buildAuthHeader({ username: 'u', password: '' })).toBe(expected);
  });
});

describe('buildSpacePrefix', () => {
  it('is empty for the default space', () => {
    expect(buildSpacePrefix(undefined)).toBe('');
    expect(buildSpacePrefix('default')).toBe('');
  });

  it('prefixes a non-default space', () => {
    expect(buildSpacePrefix('my-space')).toBe('/s/my-space');
  });
});

describe('validateAuthFlags', () => {
  it('rejects combining an api key with basic auth', () => {
    expect(() => validateAuthFlags({ apiKey: 'k', username: 'u' })).toThrow(
      /either --api-key or --username\/--password/
    );
    expect(() => validateAuthFlags({ apiKey: 'k', password: 'p' })).toThrow(
      /either --api-key or --username\/--password/
    );
  });

  it('requires username and password together', () => {
    expect(() => validateAuthFlags({ username: 'u' })).toThrow(/required together/);
    expect(() => validateAuthFlags({ password: 'p' })).toThrow(/required together/);
  });

  it('accepts valid combinations', () => {
    expect(() => validateAuthFlags({})).not.toThrow();
    expect(() => validateAuthFlags({ apiKey: 'k' })).not.toThrow();
    expect(() => validateAuthFlags({ username: 'u', password: 'p' })).not.toThrow();
  });
});

describe('kibanaGet (via fetchConnectorTypes)', () => {
  it('trims the base url, applies the space prefix, and sends the auth + version headers', async () => {
    mockedFetch.mockResolvedValue(
      new Response(JSON.stringify({ connectorTypes: { '.slack': {}, '.email': {} } }), {
        status: 200,
      })
    );

    const result = await fetchConnectorTypes(
      {
        kibanaUrl: 'http://host:5601/',
        space: 'my-space',
        username: 'elastic',
        password: 'changeme',
      },
      log
    );

    expect(result).toEqual(['.email', '.slack']);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const [callUrl, callInit] = mockedFetch.mock.calls[0];
    expect(String(callUrl)).toBe('http://host:5601/s/my-space/api/workflows/connectors');
    const headers = callInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(
      `Basic ${Buffer.from('elastic:changeme').toString('base64')}`
    );
    expect(headers['elastic-api-version']).toBe('2023-10-31');
    expect(headers['kbn-xsrf']).toBe('true');
  });

  it('maps an aborted request to a friendly timeout error', async () => {
    mockedFetch.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'TimeoutError' }));

    await expect(fetchConnectorTypes({ kibanaUrl: 'http://host' }, log)).rejects.toThrow(
      /timed out after \d+ms/
    );
  });

  it('throws with status details on a non-ok response', async () => {
    mockedFetch.mockResolvedValue(
      new Response('nope', { status: 500, statusText: 'Server Error' })
    );

    await expect(fetchConnectorTypes({ kibanaUrl: 'http://host' }, log)).rejects.toThrow(
      /failed: 500/
    );
  });
});

describe('fetchBuildInfo', () => {
  it('reads the version number and build hash from /api/status', async () => {
    mockedFetch.mockResolvedValue(
      new Response(JSON.stringify({ version: { number: '9.6.0', build_hash: 'abc123' } }), {
        status: 200,
      })
    );

    await expect(fetchBuildInfo({ kibanaUrl: 'http://host' }, log)).resolves.toEqual({
      version: '9.6.0',
      buildHash: 'abc123',
    });
  });

  it('throws when the version object is missing', async () => {
    mockedFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    await expect(fetchBuildInfo({ kibanaUrl: 'http://host' }, log)).rejects.toThrow(
      /missing version object/
    );
  });
});
