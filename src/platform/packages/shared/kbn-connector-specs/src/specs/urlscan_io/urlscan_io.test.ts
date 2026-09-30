/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { ConnectorIconsMap } from '../../connector_icons_map';
import { UrlscanIo } from './urlscan_io';
import {
  GetDomInputSchema,
  GetResultInputSchema,
  GetScanArtifactInputSchema,
  ScanUrlAndWaitInputSchema,
  ScanUrlInputSchema,
  SearchScansInputSchema,
} from './types';

interface MockClient {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
}

const createContext = (secrets: Record<string, unknown> = { authType: 'api_key_header' }) => {
  const client: MockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  const ctx = {
    client,
    config: {},
    secrets,
    log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, client };
};

const httpError = (status: number, data?: unknown) => ({ response: { status, data } });

/** The rate-limit headers urlscan attaches to every response (verified live). */
const RATE_LIMIT_HEADERS = {
  'x-rate-limit-action': 'search',
  'x-rate-limit-window': 'minute',
  'x-rate-limit-limit': '30',
  'x-rate-limit-remaining': '29',
  'x-rate-limit-reset': '2026-08-10T21:04:00.000Z',
  'x-rate-limit-reset-after': '14',
};

const action = (name: string) => {
  const found = UrlscanIo.actions?.[name];
  if (!found) {
    throw new Error(`action ${name} is not defined`);
  }
  return found;
};

/**
 * A search hit shaped from the live `GET /api/v1/search/?q=domain:elastic.co` response. Note it
 * carries no `verdicts` and no `brand` member: those are Pro-tier additions, so the projection
 * has to tolerate their absence, which is what the anonymous tier actually returns.
 */
const searchHit = {
  _id: '019fed6f-bf26-7054-bc1f-1ec0babfb8f9',
  sort: [1786394966152, '019fed6f-bf26-7054-bc1f-1ec0babfb8f9'],
  task: {
    visibility: 'public',
    method: 'automatic',
    domain: 'apm.example.com',
    apexDomain: 'example.com',
    time: '2026-08-10T20:49:26.152Z',
    source: 'certstream-suspicious',
    uuid: '019fed6f-bf26-7054-bc1f-1ec0babfb8f9',
    url: 'https://apm.example.com/',
  },
  page: {
    country: 'US',
    server: 'nginx/1.24.0 (Ubuntu)',
    redirected: 'same-domain',
    ip: '18.214.124.106',
    apexDomainAgeDays: 3820,
    domainAgeDays: 238,
    language: 'en',
    mimeType: 'text/html',
    title: 'Example',
    url: 'https://apm.example.com/login?next=%2F',
    tlsValidDays: 89,
    tlsAgeDays: 0,
    tlsValidFrom: '2026-08-10T19:18:38.000Z',
    tlsIssuer: 'YE1',
    ptr: 'ec2-18-214-124-106.compute-1.amazonaws.com',
    domain: 'apm.example.com',
    apexDomain: 'example.com',
    asnname: 'AMAZON-AES - Amazon.com, Inc., US',
    asn: 'AS14618',
    status: '200',
  },
  stats: {
    uniqIPs: 3,
    uniqCountries: 1,
    dataLength: 10802886,
    encodedDataLength: 2586905,
    requests: 43,
  },
  result: 'https://urlscan.io/api/v1/result/019fed6f-bf26-7054-bc1f-1ec0babfb8f9/',
  screenshot: 'https://urlscan.io/screenshots/019fed6f-bf26-7054-bc1f-1ec0babfb8f9.png',
};

const resultResponse = {
  task: {
    uuid: '0e37e828-a9d9-45c0-ac50-1ca579b86c72',
    url: 'https://phish.example/login',
    domain: 'phish.example',
    apexDomain: 'phish.example',
    time: '2026-08-10T12:00:00.000Z',
    visibility: 'unlisted',
    method: 'api',
    source: 'api',
    tags: ['phishing'],
    reportURL: 'https://urlscan.io/result/0e37e828-a9d9-45c0-ac50-1ca579b86c72/',
    screenshotURL: 'https://urlscan.io/screenshots/0e37e828-a9d9-45c0-ac50-1ca579b86c72.png',
    domURL: 'https://urlscan.io/dom/0e37e828-a9d9-45c0-ac50-1ca579b86c72/',
  },
  page: {
    url: 'https://phish.example/login',
    domain: 'phish.example',
    apexDomain: 'phish.example',
    title: 'Sign in',
    status: '200',
    mimeType: 'text/html',
    redirected: 'off-domain',
    ip: '203.0.113.10',
    ptr: 'host.example',
    asn: 'AS64496',
    asnname: 'EXAMPLE-AS',
    country: 'NL',
    city: 'Amsterdam',
    server: 'nginx',
    language: 'en',
    domainAgeDays: 3,
    apexDomainAgeDays: 3,
    tlsIssuer: "Let's Encrypt",
    tlsValidFrom: '2026-08-07T00:00:00.000Z',
    tlsValidDays: 89,
    tlsAgeDays: 3,
    umbrellaRank: 0,
  },
  // The Result API's stats shape, which is NOT the search hit's: it carries the per-type
  // breakdowns and derived percentages but none of the four scalar totals (requests, uniqIPs,
  // dataLength, encodedDataLength). Confirmed absent on 22 live results. An earlier version of
  // this fixture invented those four, which is what let the handler read fields that never
  // arrive.
  stats: {
    uniqCountries: 2,
    malicious: 2,
    secureRequests: 40,
    securePercentage: 95,
    totalLinks: 7,
    ipStats: [{ ip: '203.0.113.10' }, { ip: '198.51.100.7' }],
    resourceStats: [
      { type: 'Document', count: 1, size: 80, encodedSize: 30 },
      { type: 'Script', count: 1, size: 20, encodedSize: 20 },
    ],
  },
  verdicts: {
    // `malicious` deliberately omitted here to prove the boolean is normalized, not passed through.
    overall: {
      score: 80,
      categories: ['phishing'],
      brands: ['microsoft'],
      tags: ['credential'],
      hasVerdicts: true,
    },
    urlscan: {
      score: 75,
      malicious: true,
      brands: [{ key: 'microsoft', name: 'Microsoft' }],
      categories: [],
    },
    community: { score: 10, votesTotal: 3, votesMalicious: 2, votesBenign: 1 },
    engines: { score: 50, malicious: true },
  },
  lists: {
    domains: ['phish.example', 'cdn.example'],
    ips: ['203.0.113.10'],
    asns: ['AS64496'],
    countries: ['NL'],
    servers: ['nginx'],
    linkDomains: ['login.example'],
    hashes: ['a'.repeat(64)],
    certificates: [
      {
        subjectName: 'phish.example',
        issuer: "Let's Encrypt",
        validFrom: 1786389518,
        validTo: 1794165517,
      },
    ],
  },
  data: {
    requests: [
      {
        request: { request: { url: 'https://phish.example/login', method: 'GET' } },
        response: {
          response: { status: 200, mimeType: 'text/html', remoteIPAddress: '203.0.113.10' },
          hash: 'b'.repeat(64),
          size: 1234,
        },
      },
    ],
    redirects: [{ from: 'https://lure.example/c', to: 'https://phish.example/login', status: 302 }],
  },
  meta: {
    processors: {
      download: {
        data: [{ filename: 'payload.zip', sha256: 'c'.repeat(64), mimeType: 'application/zip' }],
      },
      wappa: { data: [{ app: 'Nginx' }, { app: 'jQuery' }, {}] },
      umbrella: { data: [{ hostname: 'phish.example', rank: 32138 }] },
    },
  },
  // `submitter` is present but empty on live results; `scanner.country` is the field the Result
  // API actually populates, so the projection reads that one.
  submitter: {},
  scanner: { country: 'se' },
};

const submissionResponse = {
  message: 'Submission successful',
  uuid: '0e37e828-a9d9-45c0-ac50-1ca579b86c72',
  result: 'https://urlscan.io/result/0e37e828-a9d9-45c0-ac50-1ca579b86c72/',
  api: 'https://urlscan.io/api/v1/result/0e37e828-a9d9-45c0-ac50-1ca579b86c72/',
  visibility: 'unlisted',
  url: 'https://phish.example/login',
  country: 'de',
  options: { useragent: 'Mozilla/5.0' },
};

const UUID = '0e37e828-a9d9-45c0-ac50-1ca579b86c72';

/** Clock step used when draining the scanUrlAndWait poll loop under fake timers. */
const POLL_STEP_MS = 1000;

describe('URLScan.io connector', () => {
  afterEach(() => jest.clearAllMocks());

  describe('metadata', () => {
    it('exposes the expected id and display name', () => {
      expect(UrlscanIo.metadata.id).toBe('.urlscan_io');
      expect(UrlscanIo.metadata.displayName).toBe('URLScan.io');
    });

    it('supports both workflows and agentBuilder', () => {
      expect(UrlscanIo.metadata.supportedFeatureIds).toEqual(['workflows', 'agentBuilder']);
    });

    it('ships a brand icon rather than a built-in glyph', () => {
      // The icon is the vendor's own mark, so the spec must NOT set metadata.icon and MUST have a
      // ConnectorIconsMap entry. Asserting only the absent metadata.icon would pass even if the
      // map entry were missing, which is the failure this test is named for, so check both. The
      // icon-map sync assertion in connector_spec_contract.test.ts covers the global invariant.
      expect(UrlscanIo.metadata.icon).toBeUndefined();
      expect(ConnectorIconsMap.has('.urlscan_io')).toBe(true);
    });

    it('requires at least a gold license, since the platform rejects basic for a spec connector', () => {
      expect(UrlscanIo.metadata.minimumLicense).toBe('enterprise');
    });

    it('offers a recommended key mode plus a keyless mode for the anonymous endpoints', () => {
      const types = (UrlscanIo.auth?.types ?? []).map((type) =>
        typeof type === 'string' ? type : type.type
      );
      expect(types).toEqual(['api_key_header', 'none']);
    });

    it('defaults and hides the header name, which urlscan requires to be exactly api-key', () => {
      const apiKeyType = (UrlscanIo.auth?.types ?? []).find(
        (type) => typeof type !== 'string' && type.type === 'api_key_header'
      );
      if (typeof apiKeyType === 'string' || apiKeyType === undefined) {
        throw new Error('expected an api_key_header auth type object');
      }
      expect(apiKeyType.defaults).toEqual({ headerField: 'api-key' });
      expect(apiKeyType.overrides?.meta?.headerField).toEqual({ hidden: true });
    });

    it('marks the two submitting actions as not agent-callable and every read as a tool', () => {
      const isTool = Object.fromEntries(
        Object.entries(UrlscanIo.actions).map(([name, value]) => [name, value.isTool])
      );
      expect(isTool).toEqual({
        searchScans: true,
        getResult: true,
        scanUrl: false,
        scanUrlAndWait: false,
        getScreenshot: true,
        getDom: true,
        getQuota: true,
      });
    });

    it('gives every action a plain-string description that says what it returns', () => {
      // A bare length check passes on any long string, so assert the properties that actually
      // matter for an LLM choosing an action: a plain string (never i18n.translate, which would
      // yield an object), and some statement of what comes back.
      for (const [name, value] of Object.entries(UrlscanIo.actions)) {
        const description = value.description ?? '';
        expect({ name, isPlainString: typeof value.description === 'string' }).toEqual({
          name,
          isPlainString: true,
        });
        expect({ name, saysWhatItReturns: /Returns |returns /.test(description) }).toEqual({
          name,
          saysWhatItReturns: true,
        });
      }
    });

    it('states the key requirement on exactly the actions that need one', () => {
      // The rubric's three-places check, applied to the action descriptions: an agent reading
      // only a description must learn whether it needs a credential.
      for (const name of ['getResult', 'getDom']) {
        expect({ name, mentionsKey: /API key/.test(action(name).description ?? '') }).toEqual({
          name,
          mentionsKey: true,
        });
      }
      // searchScans is the one action whose description promises it works without a key.
      expect(action('searchScans').description).toContain('without an API key');
    });

    it('never wraps an action description in i18n, and always wraps metadata.description', () => {
      // metadata.description is user-facing and must be translated; action descriptions are for
      // LLM consumption and must not be.
      expect(typeof UrlscanIo.metadata.description).toBe('string');
      for (const value of Object.values(UrlscanIo.actions)) {
        expect(typeof value.description).toBe('string');
      }
    });

    it('enables the connectivity test', () => {
      expect(UrlscanIo.test.enabled).toBe(true);
    });
  });

  describe('searchScans', () => {
    it('GETs the search endpoint with the query', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: { results: [], total: 0 }, headers: {} });
      await action('searchScans').handler(ctx, { q: 'page.domain:example.com' });
      const [url, options] = client.get.mock.calls[0];
      expect(url).toBe('https://urlscan.io/api/v1/search/');
      expect(options.params).toEqual({ q: 'page.domain:example.com' });
    });

    it('omits size and search_after when not supplied', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: { results: [] }, headers: {} });
      await action('searchScans').handler(ctx, { q: 'ip:8.8.8.8' });
      const [, options] = client.get.mock.calls[0];
      expect(Object.keys(options.params)).toEqual(['q']);
    });

    it('passes the cursor as a single comma-joined string, never an array', async () => {
      // urlscan answers 400 `"search_after" must be a string` for the bracketed array form
      // (verified live), so the cursor must stay a scalar and there must be no paramsSerializer
      // turning it into repeated keys.
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: { results: [] }, headers: {} });
      await action('searchScans').handler(ctx, {
        q: 'ip:8.8.8.8',
        searchAfter: '1786394966152,019fed6f-bf26-7054-bc1f-1ec0babfb8f9',
      });
      const [, options] = client.get.mock.calls[0];
      expect(typeof options.params.search_after).toBe('string');
      expect(options.params.search_after).toBe(
        '1786394966152,019fed6f-bf26-7054-bc1f-1ec0babfb8f9'
      );
      expect(Array.isArray(options.params.search_after)).toBe(false);
    });

    it('projects a hit to the triage fields and drops the envelope noise', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: { results: [searchHit], total: 10000, took: 12, has_more: true },
        headers: RATE_LIMIT_HEADERS,
      });
      const result = (await action('searchScans').handler(ctx, { q: 'x' })) as {
        results: Array<Record<string, unknown>>;
        total: number;
        hasMore: boolean;
        searchAfter?: string;
      };
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        uuid: '019fed6f-bf26-7054-bc1f-1ec0babfb8f9',
        url: 'https://apm.example.com/login?next=%2F',
        taskUrl: 'https://apm.example.com/',
        domain: 'apm.example.com',
        apexDomain: 'example.com',
        title: 'Example',
        time: '2026-08-10T20:49:26.152Z',
        visibility: 'public',
        method: 'automatic',
        source: 'certstream-suspicious',
        status: '200',
        ip: '18.214.124.106',
        asn: 'AS14618',
        asnName: 'AMAZON-AES - Amazon.com, Inc., US',
        country: 'US',
        server: 'nginx/1.24.0 (Ubuntu)',
        domainAgeDays: 238,
        apexDomainAgeDays: 3820,
        tlsIssuer: 'YE1',
        requests: 43,
        uniqueIps: 3,
        uniqueCountries: 1,
        // Absent on the anonymous/free tier, which is exactly what the live API returns.
        verdictScore: undefined,
        verdictMalicious: undefined,
        brands: [],
        resultApiUrl: 'https://urlscan.io/api/v1/result/019fed6f-bf26-7054-bc1f-1ec0babfb8f9/',
        screenshotUrl: 'https://urlscan.io/screenshots/019fed6f-bf26-7054-bc1f-1ec0babfb8f9.png',
      });
      expect(result.total).toBe(10000);
      expect(result.hasMore).toBe(true);
    });

    it('returns the last hit sort value as a ready-to-use cursor', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: { results: [searchHit], total: 1 },
        headers: {},
      });
      const result = (await action('searchScans').handler(ctx, { q: 'x' })) as {
        searchAfter?: string;
      };
      expect(result.searchAfter).toBe('1786394966152,019fed6f-bf26-7054-bc1f-1ec0babfb8f9');
    });

    it('leaves the cursor undefined on an empty page so a loop can stop', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: { results: [], total: 0 }, headers: {} });
      const result = (await action('searchScans').handler(ctx, { q: 'x' })) as {
        searchAfter?: string;
        hasMore: boolean;
      };
      expect(result.searchAfter).toBeUndefined();
      expect(result.hasMore).toBe(false);
    });

    it('surfaces the rate-limit budget from the response headers', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: { results: [] },
        headers: RATE_LIMIT_HEADERS,
      });
      const result = (await action('searchScans').handler(ctx, { q: 'x' })) as {
        rateLimit?: Record<string, unknown>;
      };
      expect(result.rateLimit).toEqual({
        action: 'search',
        window: 'minute',
        limit: 30,
        remaining: 29,
        resetAt: '2026-08-10T21:04:00.000Z',
        resetAfterSeconds: 14,
      });
    });

    it('omits the rate-limit block when the headers are absent', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: { results: [] }, headers: {} });
      const result = (await action('searchScans').handler(ctx, { q: 'x' })) as {
        rateLimit?: unknown;
      };
      expect(result.rateLimit).toBeUndefined();
    });

    it('surfaces a query validation error rather than treating a 400 as a credential problem', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(
        httpError(400, { message: 'ValidationError: bad query', description: 'check the syntax' })
      );
      await expect(action('searchScans').handler(ctx, { q: 'bad:(' })).rejects.toThrow(
        'urlscan.io API error (400): ValidationError: bad query: check the syntax'
      );
    });
  });

  describe('getResult', () => {
    it('GETs the result endpoint with an encoded uuid', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      await action('getResult').handler(ctx, { uuid: UUID });
      expect(client.get.mock.calls[0][0]).toBe(`https://urlscan.io/api/v1/result/${UUID}/`);
    });

    it('normalizes an omitted overall.malicious to false rather than leaving it undefined', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        verdicts: { malicious: boolean; score?: number };
      };
      expect(result.verdicts.malicious).toBe(false);
      expect(result.verdicts.score).toBe(80);
    });

    it('flattens brands from both the string and object shapes', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        verdicts: { brands: string[]; sources: { urlscan?: { brands: string[] } } };
      };
      // overall.brands is a flat array of keys; urlscan.brands is an array of objects.
      expect(result.verdicts.brands).toEqual(['microsoft']);
      expect(result.verdicts.sources.urlscan?.brands).toEqual(['Microsoft']);
    });

    it('carries the community vote counts', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        verdicts: {
          sources: { community?: { votesTotal?: number; votesMalicious?: number } };
        };
      };
      expect(result.verdicts.sources.community?.votesTotal).toBe(3);
      expect(result.verdicts.sources.community?.votesMalicious).toBe(2);
    });

    it('does not expose verdicts.engines, which the vendor documents as dead', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        verdicts: { sources: Record<string, unknown> };
      };
      expect(Object.keys(result.verdicts.sources).sort()).toEqual(['community', 'urlscan']);
    });

    it('returns the pivotable indicator lists', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        contacted: Record<string, string[]>;
      };
      expect(result.contacted.domains).toEqual(['phish.example', 'cdn.example']);
      expect(result.contacted.ips).toEqual(['203.0.113.10']);
      expect(result.contacted.asns).toEqual(['AS64496']);
      expect(result.contacted.hashes).toEqual(['a'.repeat(64)]);
    });

    it('surfaces downloaded files and detected technologies', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        downloadedFiles: Array<Record<string, unknown>>;
        technologies: string[];
      };
      expect(result.downloadedFiles).toEqual([
        { filename: 'payload.zip', sha256: 'c'.repeat(64), mimeType: 'application/zip' },
      ]);
      // The third wappa entry has no `app`, so it must be dropped rather than yielding undefined.
      expect(result.technologies).toEqual(['Nginx', 'jQuery']);
    });

    it('omits the per-request list by default and includes it on request', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const withoutRequests = (await action('getResult').handler(ctx, { uuid: UUID })) as Record<
        string,
        unknown
      >;
      expect(withoutRequests.requests).toBeUndefined();

      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const withRequests = (await action('getResult').handler(ctx, {
        uuid: UUID,
        includeRequests: true,
      })) as { requests: Array<Record<string, unknown>> };
      expect(withRequests.requests).toEqual([
        {
          url: 'https://phish.example/login',
          method: 'GET',
          status: 200,
          mimeType: 'text/html',
          remoteIp: '203.0.113.10',
          size: 1234,
          hash: 'b'.repeat(64),
        },
      ]);
    });

    // Regression: the Result API returns none of `stats.requests`, `stats.uniqIPs`,
    // `stats.dataLength` or `stats.encodedDataLength` (confirmed absent on 22 live results;
    // they exist only on a SEARCH hit). Reading them straight through returned four permanent
    // nulls, so they are derived from members that do exist.
    it('derives the scan totals the result payload does not carry directly', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        stats: Record<string, number | undefined>;
      };
      // One entry in data.requests, two in stats.ipStats, and resourceStats summing 80+20 / 30+20.
      expect(result.stats.requests).toBe(1);
      expect(result.stats.uniqueIps).toBe(2);
      expect(result.stats.dataLength).toBe(100);
      expect(result.stats.encodedDataLength).toBe(50);
      // The members the API really does send are passed through unchanged.
      expect(result.stats.uniqueCountries).toBe(2);
      expect(result.stats.securePercentage).toBe(95);
      expect(result.stats.totalLinks).toBe(7);
    });

    it('reports an unmeasured total as undefined rather than zero', async () => {
      const { ctx, client } = createContext();
      // A result with no requests list and no resourceStats: "not measured", not "zero bytes".
      client.get.mockResolvedValue({
        data: { ...resultResponse, data: {}, stats: { uniqCountries: 1 } },
        headers: {},
      });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        stats: Record<string, number | undefined>;
      };
      expect(result.stats.requests).toBeUndefined();
      expect(result.stats.dataLength).toBeUndefined();
      expect(result.stats.encodedDataLength).toBeUndefined();
    });

    it('surfaces the redirect chain and the certificates', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        redirects: Array<Record<string, unknown>>;
        certificates: Array<Record<string, unknown>>;
      };
      expect(result.redirects).toEqual([
        { from: 'https://lure.example/c', to: 'https://phish.example/login', status: 302 },
      ]);
      expect(result.certificates).toEqual([
        {
          subjectName: 'phish.example',
          issuer: "Let's Encrypt",
          validFrom: 1786389518,
          validTo: 1794165517,
        },
      ]);
    });

    it('reads the scan location from scanner.country, not the empty submitter object', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as Record<
        string,
        unknown
      >;
      expect(result.scannerCountry).toBe('se');
      expect(result.submitterCountry).toBeUndefined();
    });

    it('falls back to the umbrella processor when page.umbrellaRank is absent', async () => {
      const { ctx, client } = createContext();
      const pageWithoutRank = { ...resultResponse.page };
      delete (pageWithoutRank as { umbrellaRank?: number }).umbrellaRank;
      client.get.mockResolvedValue({
        data: { ...resultResponse, page: pageWithoutRank },
        headers: {},
      });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        page: { umbrellaRank?: number };
      };
      expect(result.page.umbrellaRank).toBe(32138);
    });

    // urlscan answers 404 for both "not indexed yet" and "no such uuid", distinguished only by
    // the body text, so the vendor's own message is passed through.
    it('distinguishes a nonexistent scan from one still processing on a 404', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(404, { message: 'No such scan submission' }));
      const missing = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        exists: boolean;
        reason?: string;
        message: string;
      };
      expect(missing.exists).toBe(false);
      expect(missing.reason).toBe('No such scan submission');
      expect(missing.message).toContain('No such scan');

      client.get.mockRejectedValue(httpError(404, { message: 'Scan is not finished yet' }));
      const pending = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        exists: boolean;
        reason?: string;
        message: string;
      };
      expect(pending.exists).toBe(true);
      expect(pending.reason).toBe('Scan is not finished yet');
      expect(pending.message).toContain('still processing');
    });

    it('does not pass the raw response through', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as Record<
        string,
        unknown
      >;
      // `data` and `meta` are the two enormous members; neither may survive the projection.
      expect(result.data).toBeUndefined();
      expect(result.meta).toBeUndefined();
      expect(result.lists).toBeUndefined();
    });

    it('returns found:false while a scan is still processing (404) rather than throwing', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(404, ''));
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        found: boolean;
        completed: boolean;
        deleted: boolean;
        uuid: string;
      };
      expect(result.found).toBe(false);
      expect(result.completed).toBe(false);
      expect(result.deleted).toBe(false);
      expect(result.uuid).toBe(UUID);
    });

    it('flags a deleted scan distinctly on a 410', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(410, ''));
      const result = (await action('getResult').handler(ctx, { uuid: UUID })) as {
        found: boolean;
        deleted: boolean;
        message: string;
      };
      expect(result.found).toBe(false);
      expect(result.deleted).toBe(true);
      expect(result.message).toContain('deleted');
    });

    it('raises a configuration error on the 403 the endpoint returns without a key', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(403, { warning: "You're not logged in!" }));
      await expect(action('getResult').handler(ctx, { uuid: UUID })).rejects.toThrow(
        /credential \(HTTP 403\)/
      );
    });

    it('raises a configuration error on a 401 from an unknown key', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(
        httpError(401, { message: 'API key supplied but not found in database!' })
      );
      await expect(action('getResult').handler(ctx, { uuid: UUID })).rejects.toThrow(
        /not found in database/
      );
    });

    it('raises a configuration error on the 400 a malformed key produces', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(400, { message: 'Invalid API key format' }));
      await expect(action('getResult').handler(ctx, { uuid: UUID })).rejects.toThrow(
        /Invalid API key format/
      );
    });

    // Regression: not every 403 is about the credential. urlscan answers 403 for a plan
    // entitlement too (verified live with a valid, accepted key), and rewriting that into
    // "set a valid key on the connector" sends an operator to rotate a key that works.
    it('does not blame the credential for a 403 that is really a plan limit', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(
        httpError(403, {
          message: "Your current plan does not allow you to search field 'verdicts.score'",
        })
      );
      const attempt = action('getResult').handler(ctx, { uuid: UUID });
      await expect(attempt).rejects.toThrow(/current plan does not allow/);
      await expect(action('getResult').handler(ctx, { uuid: UUID })).rejects.not.toThrow(
        /connector's credential/
      );
    });
  });

  describe('scanUrl', () => {
    it('POSTs the submission with every modifier in the JSON body, not the query string', async () => {
      const { ctx, client } = createContext();
      client.post.mockResolvedValue({ data: submissionResponse, headers: {} });
      await action('scanUrl').handler(ctx, {
        url: 'https://phish.example/login',
        visibility: 'unlisted',
        tags: ['phishing'],
        referer: 'https://mail.example/',
        customagent: 'Mozilla/5.0 (iPhone)',
        country: 'de',
        overrideSafety: true,
      });
      const [url, body, options] = client.post.mock.calls[0];
      expect(url).toBe('https://urlscan.io/api/v1/scan/');
      expect(body).toEqual({
        url: 'https://phish.example/login',
        visibility: 'unlisted',
        tags: ['phishing'],
        referer: 'https://mail.example/',
        customagent: 'Mozilla/5.0 (iPhone)',
        country: 'de',
        overrideSafety: true,
      });
      // No query params at all: the vendor's submission reference documents every option as a
      // member of the POST body.
      expect(options?.params).toBeUndefined();
      expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('sends only the url when no modifiers are given', async () => {
      const { ctx, client } = createContext();
      client.post.mockResolvedValue({ data: submissionResponse, headers: {} });
      await action('scanUrl').handler(ctx, { url: 'https://phish.example/login' });
      expect(client.post.mock.calls[0][1]).toEqual({ url: 'https://phish.example/login' });
    });

    it('returns the uuid and links, and does not imply the scan finished', async () => {
      const { ctx, client } = createContext();
      client.post.mockResolvedValue({ data: submissionResponse, headers: {} });
      const result = (await action('scanUrl').handler(ctx, {
        url: 'https://phish.example/login',
      })) as Record<string, unknown>;
      expect(result).toEqual({
        uuid: UUID,
        message: 'Submission successful',
        resultApiUrl: `https://urlscan.io/api/v1/result/${UUID}/`,
        reportUrl: `https://urlscan.io/result/${UUID}/`,
        visibility: 'unlisted',
        url: 'https://phish.example/login',
        country: 'de',
        scannerUserAgent: 'Mozilla/5.0',
      });
      // A submission is asynchronous, so nothing may claim completion or carry a verdict.
      expect(result.completed).toBeUndefined();
      expect(result.verdicts).toBeUndefined();
    });

    it('surfaces the vendor description when a submission is refused', async () => {
      const { ctx, client } = createContext();
      client.post.mockRejectedValue(
        httpError(400, {
          message: 'DNS Error',
          description: 'The domain .example could not be resolved to a valid IPv4/IPv6 address',
        })
      );
      await expect(
        action('scanUrl').handler(ctx, { url: 'https://nonexistent.example/' })
      ).rejects.toThrow('could not be resolved');
    });
  });

  describe('scanUrlAndWait', () => {
    beforeEach(() => jest.useFakeTimers({ doNotFake: ['performance'] }));
    afterEach(() => {
      // Drop any sleep still pending on a failed expectation, so the suite leaves no open handle.
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    /**
     * Run the handler to completion under fake timers. The handler interleaves awaited HTTP calls
     * with `setTimeout` sleeps, so each iteration has to flush the microtask queue *and* advance
     * the clock; looping until the promise settles keeps the test independent of the exact number
     * of polls. Returns the handler's resolved value.
     */
    const runToCompletion = async <T>(promise: Promise<T>): Promise<T> => {
      let settled = false;
      const tracked = promise.then(
        (value) => {
          settled = true;
          return value;
        },
        (error) => {
          settled = true;
          throw error;
        }
      );
      for (let i = 0; i < 200 && !settled; i++) {
        // Let any pending .then callbacks run, then release the next sleep.
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(POLL_STEP_MS);
      }
      return tracked;
    };

    it('submits, polls past the not-ready 404s, and returns the finished result', async () => {
      const { ctx, client } = createContext();
      client.post.mockResolvedValue({ data: submissionResponse, headers: {} });
      client.get
        .mockRejectedValueOnce(httpError(404, ''))
        .mockResolvedValueOnce({ data: resultResponse, headers: RATE_LIMIT_HEADERS });

      const result = (await runToCompletion(
        action('scanUrlAndWait').handler(ctx, { url: 'https://phish.example/login' })
      )) as {
        found: boolean;
        pollAttempts: number;
        submission: Record<string, unknown>;
        verdicts: { score?: number };
      };
      expect(result.found).toBe(true);
      expect(result.pollAttempts).toBe(2);
      expect(result.submission.uuid).toBe(UUID);
      expect(result.verdicts.score).toBe(80);
    });

    it('waits before the first poll rather than burning quota on a certain 404', async () => {
      const { ctx, client } = createContext();
      client.post.mockResolvedValue({ data: submissionResponse, headers: {} });
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });

      const promise = action('scanUrlAndWait').handler(ctx, {
        url: 'https://phish.example/login',
      });
      // Let the submission settle, but do not advance the clock: the first poll must not have
      // happened yet, because urlscan's guidance is to wait ~10s before asking for a result.
      await Promise.resolve();
      await Promise.resolve();
      expect(client.get).not.toHaveBeenCalled();
      await runToCompletion(promise);
      expect(client.get).toHaveBeenCalled();
    });

    it('always polls at least once, even at the schema-minimum timeout', async () => {
      // Regression: the initial delay used to be Math.min(10s, budget), which at the schema
      // minimum of timeoutSeconds: 10 consumed the entire budget and left the loop condition
      // false on entry. The action spent a real submission (quota, and a published URL at
      // public visibility) and returned without ever asking for the result.
      const { ctx, client } = createContext();
      client.post.mockResolvedValue({ data: submissionResponse, headers: {} });
      client.get.mockResolvedValue({ data: resultResponse, headers: {} });

      const result = (await runToCompletion(
        action('scanUrlAndWait').handler(ctx, {
          url: 'https://phish.example/login',
          timeoutSeconds: 10,
        })
      )) as { found: boolean; pollAttempts: number };
      expect(client.get).toHaveBeenCalled();
      expect(result.pollAttempts).toBeGreaterThanOrEqual(1);
      expect(result.found).toBe(true);
    });

    it('polls at least once at the minimum timeout even when the scan is not ready', async () => {
      const { ctx, client } = createContext();
      client.post.mockResolvedValue({ data: submissionResponse, headers: {} });
      client.get.mockRejectedValue(httpError(404, ''));

      const result = (await runToCompletion(
        action('scanUrlAndWait').handler(ctx, {
          url: 'https://phish.example/login',
          timeoutSeconds: 10,
        })
      )) as { found: boolean; completed: boolean; uuid: string; pollAttempts: number };
      // The scan genuinely has not finished, so this is the timeout path, but the connector must
      // have actually checked, and must hand the uuid back so the caller can collect it later.
      expect(result.pollAttempts).toBeGreaterThanOrEqual(1);
      expect(result.found).toBe(false);
      expect(result.uuid).toBe(UUID);
    });

    it('hands back the uuid instead of failing when the scan outlives the timeout', async () => {
      const { ctx, client } = createContext();
      client.post.mockResolvedValue({ data: submissionResponse, headers: {} });
      client.get.mockRejectedValue(httpError(404, ''));

      const result = (await runToCompletion(
        action('scanUrlAndWait').handler(ctx, {
          url: 'https://phish.example/login',
          timeoutSeconds: 20,
        })
      )) as {
        found: boolean;
        completed: boolean;
        uuid: string;
        message: string;
      };
      expect(result.found).toBe(false);
      expect(result.completed).toBe(false);
      expect(result.uuid).toBe(UUID);
      expect(result.message).toContain('getResult');
    });

    it('reports a mid-flight deletion as data rather than an error', async () => {
      const { ctx, client } = createContext();
      client.post.mockResolvedValue({ data: submissionResponse, headers: {} });
      client.get.mockRejectedValue(httpError(410, ''));

      const result = (await runToCompletion(
        action('scanUrlAndWait').handler(ctx, { url: 'https://phish.example/login' })
      )) as { found: boolean; deleted: boolean };
      expect(result.found).toBe(false);
      expect(result.deleted).toBe(true);
    });

    it('throws when the submission is accepted but carries no uuid to poll', async () => {
      const { ctx, client } = createContext();
      client.post.mockResolvedValue({ data: { message: 'ok' }, headers: {} });
      await expect(
        action('scanUrlAndWait').handler(ctx, { url: 'https://phish.example/login' })
      ).rejects.toThrow('no scan uuid');
    });
  });

  describe('getScreenshot', () => {
    it('GETs the site-root screenshot path as binary and returns base64', async () => {
      const { ctx, client } = createContext();
      const png = Buffer.from('fake-png-bytes');
      client.get.mockResolvedValue({ data: png, headers: {} });
      const result = (await action('getScreenshot').handler(ctx, { uuid: UUID })) as {
        found: boolean;
        base64: string;
        byteLength: number;
        contentType: string;
        screenshotUrl: string;
      };
      const [url, options] = client.get.mock.calls[0];
      expect(url).toBe(`https://urlscan.io/screenshots/${UUID}.png`);
      expect(options.responseType).toBe('arraybuffer');
      expect(result.found).toBe(true);
      expect(result.contentType).toBe('image/png');
      expect(result.base64).toBe(png.toString('base64'));
      expect(result.byteLength).toBe(png.byteLength);
    });

    it('returns found:false when no screenshot was stored', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(404, ''));
      const result = (await action('getScreenshot').handler(ctx, { uuid: UUID })) as {
        found: boolean;
        screenshotUrl: string;
      };
      expect(result.found).toBe(false);
      expect(result.screenshotUrl).toBe(`https://urlscan.io/screenshots/${UUID}.png`);
    });

    it('warns in its description about the base64 payload, including not pasting it into chat', () => {
      const description = action('getScreenshot').description ?? '';
      expect(description).toContain('WARNING');
      expect(description).toContain('base64');
      // The specific instruction that keeps a large blob out of an agent transcript.
      expect(description).toContain('never include the base64 blob in a chat response');
    });

    it('reports a malformed key as a credential problem even though it needs no key', () => {
      // This endpoint is anonymous, but urlscan answers 400 "Invalid API key format" on EVERY
      // endpoint when the configured key is malformed, so the operator must be pointed at the
      // connector's own credential rather than shown a raw vendor string.
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(400, { message: 'Invalid API key format' }));
      return expect(action('getScreenshot').handler(ctx, { uuid: UUID })).rejects.toThrow(
        /credential \(HTTP 400\)/
      );
    });
  });

  describe('getDom', () => {
    it('GETs the site-root DOM path as text', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: '<html></html>', headers: {} });
      await action('getDom').handler(ctx, { uuid: UUID });
      const [url, options] = client.get.mock.calls[0];
      expect(url).toBe(`https://urlscan.io/dom/${UUID}/`);
      expect(options.responseType).toBe('text');
    });

    it('truncates at the default cap and reports the full length', async () => {
      const { ctx, client } = createContext();
      const dom = 'x'.repeat(60_000);
      client.get.mockResolvedValue({ data: dom, headers: {} });
      const result = (await action('getDom').handler(ctx, { uuid: UUID })) as {
        truncated: boolean;
        fullLength: number;
        dom: string;
      };
      expect(result.truncated).toBe(true);
      expect(result.fullLength).toBe(60_000);
      expect(result.dom).toHaveLength(50_000);
    });

    it('does not truncate a DOM under the cap', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: '<html>small</html>', headers: {} });
      const result = (await action('getDom').handler(ctx, { uuid: UUID })) as {
        truncated: boolean;
        dom: string;
      };
      expect(result.truncated).toBe(false);
      expect(result.dom).toBe('<html>small</html>');
    });

    it('honours a raised maxLength', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: 'y'.repeat(60_000), headers: {} });
      const result = (await action('getDom').handler(ctx, {
        uuid: UUID,
        maxLength: 55_000,
      })) as { dom: string; truncated: boolean };
      expect(result.dom).toHaveLength(55_000);
      expect(result.truncated).toBe(true);
    });

    it('returns found:false when no DOM was stored', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(404, ''));
      const result = (await action('getDom').handler(ctx, { uuid: UUID })) as { found: boolean };
      expect(result.found).toBe(false);
    });

    it('raises a configuration error on the 403 the endpoint returns without a key', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(403, { warning: "You're not logged in!" }));
      await expect(action('getDom').handler(ctx, { uuid: UUID })).rejects.toThrow(
        /credential \(HTTP 403\)/
      );
    });

    it('tells an agent to treat the DOM as untrusted', () => {
      expect(action('getDom').description).toContain('untrusted');
    });
  });

  describe('getQuota', () => {
    it('GETs the quota endpoint outside /api/v1 and flattens the per-action windows', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: {
          scope: 'user',
          limits: {
            search: { day: { limit: 500, used: 5, remaining: 495 } },
            private: { minute: { limit: 5, used: 0, remaining: 5 } },
            maxSearchResults: 10000,
            maxRetentionPeriodDays: 90,
            queryVisibility: ['public', 'unlisted'],
          },
        },
        headers: {},
      });
      const result = (await action('getQuota').handler(ctx, {})) as {
        scope: string;
        limits: Record<string, unknown>;
        maxSearchResults: unknown;
        queryableVisibility: unknown;
      };
      expect(client.get.mock.calls[0][0]).toBe('https://urlscan.io/user/quotas/');
      expect(result.scope).toBe('user');
      expect(result.limits).toEqual({
        search: { day: { limit: 500, used: 5, remaining: 495 } },
        private: { minute: { limit: 5, used: 0, remaining: 5 } },
      });
      // The scalar members sit alongside the window objects and must not be treated as windows.
      expect(result.maxSearchResults).toBe(10000);
      expect(result.queryableVisibility).toEqual(['public', 'unlisted']);
    });

    it('reports the ip-address scope an anonymous caller gets', async () => {
      const { ctx, client } = createContext({ authType: 'none' });
      client.get.mockResolvedValue({ data: { scope: 'ip-address', limits: {} }, headers: {} });
      const result = (await action('getQuota').handler(ctx, {})) as { scope: string };
      expect(result.scope).toBe('ip-address');
    });
  });

  describe('test handler', () => {
    it('passes on a user-scoped quota response when a key is configured', async () => {
      const { ctx, client } = createContext({ authType: 'api_key_header' });
      client.get.mockResolvedValue({
        data: { scope: 'user', limits: { search: { day: { limit: 5000 } } } },
        headers: {},
      });
      const result = (await UrlscanIo.test.handler(ctx)) as {
        message: string;
        authenticated: boolean;
        searchRequestsPerDay?: number;
      };
      expect(result.authenticated).toBe(true);
      expect(result.message).toContain('authenticated');
      expect(result.searchRequestsPerDay).toBe(5000);
      // ConnectorTestHandlerResult forbids `ok`.
      expect((result as Record<string, unknown>).ok).toBeUndefined();
    });

    it('fails when a key is configured but the quota scope shows it was not applied', async () => {
      // A 200 alone does not prove the key worked: urlscan answers anonymous callers too.
      const { ctx, client } = createContext({ authType: 'api_key_header' });
      client.get.mockResolvedValue({ data: { scope: 'ip-address', limits: {} }, headers: {} });
      await expect(UrlscanIo.test.handler(ctx)).rejects.toThrow(/was not applied/);
    });

    it('passes anonymously, and says which actions still need a key', async () => {
      const { ctx, client } = createContext({ authType: 'none' });
      client.get.mockResolvedValue({ data: { scope: 'ip-address', limits: {} }, headers: {} });
      const result = (await UrlscanIo.test.handler(ctx)) as {
        message: string;
        authenticated: boolean;
      };
      expect(result.authenticated).toBe(false);
      expect(result.message).toContain('API key');
    });

    it('raises the credential error on the 400 a malformed key produces', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(400, { message: 'Invalid API key format' }));
      await expect(UrlscanIo.test.handler(ctx)).rejects.toThrow(/Invalid API key format/);
    });

    it('throws when the API is unreachable, so the UI reports a failure', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(UrlscanIo.test.handler(ctx)).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('input schemas', () => {
    it('requires an http or https URL and rejects other schemes', () => {
      expect(ScanUrlInputSchema.safeParse({ url: 'https://example.com/a' }).success).toBe(true);
      expect(ScanUrlInputSchema.safeParse({ url: 'http://example.com/a' }).success).toBe(true);
      expect(ScanUrlInputSchema.safeParse({ url: 'file:///etc/passwd' }).success).toBe(false);
      expect(ScanUrlInputSchema.safeParse({ url: 'gopher://example.com' }).success).toBe(false);
      expect(ScanUrlInputSchema.safeParse({ url: 'example.com' }).success).toBe(false);
    });

    it('caps tags at ten entries', () => {
      const tags = (count: number) => Array.from({ length: count }, (_, i) => `t${i}`);
      expect(
        ScanUrlInputSchema.safeParse({ url: 'https://a.example/', tags: tags(10) }).success
      ).toBe(true);
      expect(
        ScanUrlInputSchema.safeParse({ url: 'https://a.example/', tags: tags(11) }).success
      ).toBe(false);
    });

    it('restricts visibility to the three documented values', () => {
      for (const visibility of ['public', 'unlisted', 'private']) {
        expect(
          ScanUrlInputSchema.safeParse({ url: 'https://a.example/', visibility }).success
        ).toBe(true);
      }
      expect(
        ScanUrlInputSchema.safeParse({ url: 'https://a.example/', visibility: 'secret' }).success
      ).toBe(false);
    });

    it('requires a two-letter country code', () => {
      expect(
        ScanUrlInputSchema.safeParse({ url: 'https://a.example/', country: 'de' }).success
      ).toBe(true);
      expect(
        ScanUrlInputSchema.safeParse({ url: 'https://a.example/', country: 'deu' }).success
      ).toBe(false);
      expect(
        ScanUrlInputSchema.safeParse({ url: 'https://a.example/', country: '12' }).success
      ).toBe(false);
    });

    it('bounds the scanUrlAndWait timeout to a sane polling window', () => {
      expect(
        ScanUrlAndWaitInputSchema.safeParse({ url: 'https://a.example/', timeoutSeconds: 10 })
          .success
      ).toBe(true);
      expect(
        ScanUrlAndWaitInputSchema.safeParse({ url: 'https://a.example/', timeoutSeconds: 180 })
          .success
      ).toBe(true);
      expect(
        ScanUrlAndWaitInputSchema.safeParse({ url: 'https://a.example/', timeoutSeconds: 9 })
          .success
      ).toBe(false);
      expect(
        ScanUrlAndWaitInputSchema.safeParse({ url: 'https://a.example/', timeoutSeconds: 181 })
          .success
      ).toBe(false);
    });

    it('requires a uuid-shaped scan id on every retrieval action', () => {
      for (const schema of [GetResultInputSchema, GetScanArtifactInputSchema, GetDomInputSchema]) {
        expect(schema.safeParse({ uuid: UUID }).success).toBe(true);
        expect(schema.safeParse({ uuid: 'not-a-uuid' }).success).toBe(false);
        // Path-structural characters must never reach the URL.
        expect(schema.safeParse({ uuid: '../../admin' }).success).toBe(false);
      }
    });

    it('bounds the search query and size', () => {
      expect(SearchScansInputSchema.safeParse({ q: 'ip:8.8.8.8' }).success).toBe(true);
      expect(SearchScansInputSchema.safeParse({ q: '' }).success).toBe(false);
      expect(SearchScansInputSchema.safeParse({ q: 'x'.repeat(2001) }).success).toBe(false);
      expect(SearchScansInputSchema.safeParse({ q: 'x', size: 10_000 }).success).toBe(true);
      expect(SearchScansInputSchema.safeParse({ q: 'x', size: 10_001 }).success).toBe(false);
      expect(SearchScansInputSchema.safeParse({ q: 'x', size: 0 }).success).toBe(false);
    });

    it('validates the searchAfter cursor shape so a hand-built value fails fast', () => {
      expect(
        SearchScansInputSchema.safeParse({
          q: 'x',
          searchAfter: '1786394966152,019fed6f-bf26-7054-bc1f-1ec0babfb8f9',
        }).success
      ).toBe(true);
      expect(
        SearchScansInputSchema.safeParse({ q: 'x', searchAfter: '1786394966152' }).success
      ).toBe(false);
      expect(SearchScansInputSchema.safeParse({ q: 'x', searchAfter: 'abc,def' }).success).toBe(
        false
      );
    });

    it('bounds the DOM maxLength', () => {
      expect(GetDomInputSchema.safeParse({ uuid: UUID, maxLength: 1000 }).success).toBe(true);
      expect(GetDomInputSchema.safeParse({ uuid: UUID, maxLength: 500_000 }).success).toBe(true);
      expect(GetDomInputSchema.safeParse({ uuid: UUID, maxLength: 999 }).success).toBe(false);
      expect(GetDomInputSchema.safeParse({ uuid: UUID, maxLength: 500_001 }).success).toBe(false);
    });
  });
});
