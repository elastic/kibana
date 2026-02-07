/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fetch from 'node-fetch';
import { resolveKibanaUrl } from './resolve_kibana_url';

jest.mock('node-fetch', () => jest.fn());

describe('resolveKibanaUrl', () => {
  const mockFetch = fetch as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect and append dev mode base path when redirect location is a relative path', async () => {
    mockFetch.mockResolvedValue({
      status: 302,
      headers: {
        get: jest.fn().mockReturnValue('/abc'),
      },
    });

    const result = await resolveKibanaUrl('http://localhost:5601');

    expect(result).toBe('http://localhost:5601/abc');
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:5601', {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'kbn-xsrf': 'true',
      },
    });
  });

  it('should detect and append dev mode base path when redirect location is a full URL', async () => {
    // node-fetch returns full URLs in the location header, not just the path
    mockFetch.mockResolvedValue({
      status: 302,
      headers: {
        get: jest.fn().mockReturnValue('http://localhost:5601/wmy'),
      },
    });

    const result = await resolveKibanaUrl('http://localhost:5601');

    expect(result).toBe('http://localhost:5601/wmy');
  });

  it('should return original URL when response is not a redirect', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    });

    const result = await resolveKibanaUrl('http://localhost:5601');

    expect(result).toBe('http://localhost:5601');
  });

  it('should return original URL when redirect location does not match 3-letter pattern', async () => {
    mockFetch.mockResolvedValue({
      status: 302,
      headers: {
        get: jest.fn().mockReturnValue('/app/home'),
      },
    });

    const result = await resolveKibanaUrl('http://localhost:5601');

    expect(result).toBe('http://localhost:5601');
  });

  it('should return original URL when redirect location is null', async () => {
    mockFetch.mockResolvedValue({
      status: 302,
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    });

    const result = await resolveKibanaUrl('http://localhost:5601');

    expect(result).toBe('http://localhost:5601');
  });

  it('should return original URL when connection fails', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await resolveKibanaUrl('http://localhost:5601');

    expect(result).toBe('http://localhost:5601');
  });

  it('should handle redirect status codes 300-399', async () => {
    // Test with 301 redirect
    mockFetch.mockResolvedValue({
      status: 301,
      headers: {
        get: jest.fn().mockReturnValue('/xyz'),
      },
    });

    const result = await resolveKibanaUrl('http://localhost:5601');

    expect(result).toBe('http://localhost:5601/xyz');
  });

  it('should not match patterns longer than 3 characters', async () => {
    mockFetch.mockResolvedValue({
      status: 302,
      headers: {
        get: jest.fn().mockReturnValue('/abcd'),
      },
    });

    const result = await resolveKibanaUrl('http://localhost:5601');

    expect(result).toBe('http://localhost:5601');
  });

  it('should not match patterns shorter than 3 characters', async () => {
    mockFetch.mockResolvedValue({
      status: 302,
      headers: {
        get: jest.fn().mockReturnValue('/ab'),
      },
    });

    const result = await resolveKibanaUrl('http://localhost:5601');

    expect(result).toBe('http://localhost:5601');
  });

  it('should not match full URL with non-base-path pattern', async () => {
    mockFetch.mockResolvedValue({
      status: 302,
      headers: {
        get: jest.fn().mockReturnValue('http://localhost:5601/app/home'),
      },
    });

    const result = await resolveKibanaUrl('http://localhost:5601');

    expect(result).toBe('http://localhost:5601');
  });
});
