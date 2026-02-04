/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mock the Client constructor BEFORE any imports
const mockClient = jest.fn();
jest.mock('@elastic/elasticsearch', () => ({
  Client: mockClient,
}));

describe('elasticsearch client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.mockClear();
    // Reset process.env
    process.env = { ...originalEnv };
    // Clear the module cache to re-import with new env vars
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('initializes client with cloud ID when ELASTICSEARCH_CLOUD_ID is set', async () => {
    process.env.ELASTICSEARCH_CLOUD_ID = 'cloud-id:base64encoded';
    delete process.env.ELASTICSEARCH_ENDPOINT;
    delete process.env.ELASTICSEARCH_API_KEY;

    // Re-import to get fresh module with new env vars
    await import('./elasticsearch');

    expect(mockClient).toHaveBeenCalledWith({
      cloud: { id: 'cloud-id:base64encoded' },
      auth: { username: 'elastic', password: 'changeme' },
    });
  });

  it('initializes client with endpoint when ELASTICSEARCH_ENDPOINT is set', async () => {
    process.env.ELASTICSEARCH_ENDPOINT = 'http://localhost:9200';
    delete process.env.ELASTICSEARCH_CLOUD_ID;
    delete process.env.ELASTICSEARCH_API_KEY;

    await import('./elasticsearch');

    expect(mockClient).toHaveBeenCalledWith({
      node: 'http://localhost:9200',
      auth: { username: 'elastic', password: 'changeme' },
    });
  });

  it('prefers cloud ID over endpoint', async () => {
    process.env.ELASTICSEARCH_CLOUD_ID = 'cloud-id:base64encoded';
    process.env.ELASTICSEARCH_ENDPOINT = 'http://localhost:9200';

    await import('./elasticsearch');

    expect(mockClient).toHaveBeenCalledWith({
      cloud: { id: 'cloud-id:base64encoded' },
      auth: { username: 'elastic', password: 'changeme' },
    });
    expect(mockClient).not.toHaveBeenCalledWith(
      expect.objectContaining({ node: expect.anything() })
    );
  });

  it('initializes client with API key when ELASTICSEARCH_API_KEY is set', async () => {
    process.env.ELASTICSEARCH_API_KEY = 'api-key-123';
    process.env.ELASTICSEARCH_ENDPOINT = 'http://localhost:9200';
    delete process.env.ELASTICSEARCH_CLOUD_ID;
    delete process.env.ELASTICSEARCH_PASSWORD;

    await import('./elasticsearch');

    expect(mockClient).toHaveBeenCalledWith({
      node: 'http://localhost:9200',
      auth: { apiKey: 'api-key-123' },
    });
  });

  it('initializes client with username and password when set', async () => {
    process.env.ELASTICSEARCH_USERNAME = 'myuser';
    process.env.ELASTICSEARCH_PASSWORD = 'mypass';
    process.env.ELASTICSEARCH_ENDPOINT = 'http://localhost:9200';
    delete process.env.ELASTICSEARCH_CLOUD_ID;
    delete process.env.ELASTICSEARCH_API_KEY;

    await import('./elasticsearch');

    expect(mockClient).toHaveBeenCalledWith({
      node: 'http://localhost:9200',
      auth: {
        username: 'myuser',
        password: 'mypass',
      },
    });
  });

  it('prefers API key over username/password', async () => {
    process.env.ELASTICSEARCH_API_KEY = 'api-key-123';
    process.env.ELASTICSEARCH_USERNAME = 'myuser';
    process.env.ELASTICSEARCH_PASSWORD = 'mypass';
    process.env.ELASTICSEARCH_ENDPOINT = 'http://localhost:9200';

    await import('./elasticsearch');

    expect(mockClient).toHaveBeenCalledWith({
      node: 'http://localhost:9200',
      auth: { apiKey: 'api-key-123' },
    });
    expect(mockClient).not.toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({ username: expect.anything() }),
      })
    );
  });

  it('uses default username when ELASTICSEARCH_USERNAME is not set', async () => {
    delete process.env.ELASTICSEARCH_USERNAME;
    process.env.ELASTICSEARCH_PASSWORD = 'mypass';
    process.env.ELASTICSEARCH_ENDPOINT = 'http://localhost:9200';
    delete process.env.ELASTICSEARCH_CLOUD_ID;
    delete process.env.ELASTICSEARCH_API_KEY;

    await import('./elasticsearch');

    expect(mockClient).toHaveBeenCalledWith({
      node: 'http://localhost:9200',
      auth: {
        username: 'elastic',
        password: 'mypass',
      },
    });
  });

  it('uses default password when ELASTICSEARCH_PASSWORD is not set', async () => {
    process.env.ELASTICSEARCH_USERNAME = 'myuser';
    delete process.env.ELASTICSEARCH_PASSWORD;
    process.env.ELASTICSEARCH_ENDPOINT = 'http://localhost:9200';
    delete process.env.ELASTICSEARCH_CLOUD_ID;
    delete process.env.ELASTICSEARCH_API_KEY;

    await import('./elasticsearch');

    expect(mockClient).toHaveBeenCalledWith({
      node: 'http://localhost:9200',
      auth: {
        username: 'myuser',
        password: 'changeme',
      },
    });
  });

  it('uses default endpoint when not set', async () => {
    delete process.env.ELASTICSEARCH_ENDPOINT;
    delete process.env.ELASTICSEARCH_CLOUD_ID;
    delete process.env.ELASTICSEARCH_API_KEY;

    await import('./elasticsearch');

    expect(mockClient).toHaveBeenCalledWith({
      node: 'http://localhost:9200',
      auth: { username: 'elastic', password: 'changeme' },
    });
  });

  it('initializes client with minimal config when only defaults are available', async () => {
    delete process.env.ELASTICSEARCH_CLOUD_ID;
    delete process.env.ELASTICSEARCH_ENDPOINT;
    delete process.env.ELASTICSEARCH_API_KEY;
    delete process.env.ELASTICSEARCH_USERNAME;
    delete process.env.ELASTICSEARCH_PASSWORD;

    await import('./elasticsearch');

    expect(mockClient).toHaveBeenCalledWith({
      node: 'http://localhost:9200',
      auth: {
        username: 'elastic',
        password: 'changeme',
      },
    });
  });
});
