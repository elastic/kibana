/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Whois } from './whois';
import {
  LookupAsnInputSchema,
  LookupDomainInputSchema,
  LookupEntityInputSchema,
  LookupIpInputSchema,
  LookupNameserverInputSchema,
} from './types';

const RDAP_HEADERS = { headers: { Accept: 'application/rdap+json' } };

interface MockClient {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  patch: jest.Mock;
  delete: jest.Mock;
}

const createContext = (config: Record<string, unknown> = {}) => {
  const client: MockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  const ctx = {
    client,
    config,
    secrets: { authType: 'none' },
    log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, client };
};

const httpError = (status: number, data?: unknown) => ({ response: { status, data } });

/**
 * A realistic .com domain response, shaped from the live rdap.verisign.com reply for
 * elastic.com: a registrar entity with a nested abuse child, registration/expiration events,
 * a nameserver array, and the notices/links boilerplate the trim is meant to drop.
 */
const domainResponse = {
  objectClassName: 'domain',
  handle: '133013863_DOMAIN_COM-VRSN',
  ldhName: 'ELASTIC.COM',
  links: [{ rel: 'self', href: 'https://rdap.verisign.com/com/v1/domain/elastic.com' }],
  status: ['client delete prohibited', 'client transfer prohibited'],
  entities: [
    {
      objectClassName: 'entity',
      handle: '146',
      roles: ['registrar'],
      publicIds: [{ type: 'IANA Registrar ID', identifier: '146' }],
      vcardArray: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'GoDaddy.com, LLC'],
        ],
      ],
      entities: [
        {
          objectClassName: 'entity',
          roles: ['abuse'],
          vcardArray: [
            'vcard',
            [
              ['version', {}, 'text', '4.0'],
              ['tel', { type: 'voice' }, 'uri', 'tel:480-624-2505'],
              ['email', {}, 'text', 'abuse@godaddy.com'],
            ],
          ],
        },
      ],
    },
    {
      objectClassName: 'entity',
      handle: 'REG-123',
      roles: ['registrant'],
      vcardArray: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'REDACTED FOR PRIVACY'],
          ['org', {}, 'text', 'Elasticsearch BV'],
          ['adr', {}, 'text', ['', '', '', 'Amsterdam', '', '1011', 'NL']],
        ],
      ],
    },
  ],
  events: [
    { eventAction: 'registration', eventDate: '2004-10-16T18:08:31Z' },
    { eventAction: 'expiration', eventDate: '2026-10-16T18:08:31Z' },
    { eventAction: 'last changed', eventDate: '2024-10-26T03:31:33Z' },
  ],
  secureDNS: { delegationSigned: false },
  nameservers: [
    { objectClassName: 'nameserver', ldhName: 'NS1-34.AZURE-DNS.COM' },
    {
      objectClassName: 'nameserver',
      ldhName: 'NS2-34.AZURE-DNS.NET',
      ipAddresses: { v4: ['1.2.3.4'] },
    },
  ],
  notices: [{ title: 'Terms of Service', description: ['Service subject to Terms of Use.'] }],
  rdapConformance: ['rdap_level_0'],
  port43: 'whois.verisign-grs.com',
};

/** Shaped from the live rdap.arin.net reply for 8.8.8.8. */
const ipResponse = {
  objectClassName: 'ip network',
  handle: 'NET-8-8-8-0-2',
  startAddress: '8.8.8.0',
  endAddress: '8.8.8.255',
  ipVersion: 'v4',
  name: 'GOGL',
  type: 'DIRECT ALLOCATION',
  parentHandle: 'NET-8-0-0-0-0',
  status: ['active'],
  cidr0_cidrs: [{ v4prefix: '8.8.8.0', length: 24 }],
  arin_originas0_originautnums: [15169],
  events: [
    { eventAction: 'registration', eventDate: '2023-12-28T17:24:33-05:00' },
    { eventAction: 'last changed', eventDate: '2023-12-28T17:24:56-05:00' },
  ],
  entities: [
    {
      objectClassName: 'entity',
      handle: 'GOGL',
      roles: ['registrant'],
      vcardArray: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'Google LLC'],
          [
            'adr',
            { label: '1600 Amphitheatre Parkway\nMountain View\nCA\n94043\nUnited States' },
            'text',
            ['', '', '', '', '', '', ''],
          ],
        ],
      ],
      entities: [
        {
          objectClassName: 'entity',
          handle: 'ABUSE5250-ARIN',
          roles: ['abuse'],
          vcardArray: [
            'vcard',
            [
              ['version', {}, 'text', '4.0'],
              ['fn', {}, 'text', 'Abuse'],
              ['org', {}, 'text', 'Google Inc.'],
              ['email', {}, 'text', 'network-abuse@google.com'],
              ['tel', { type: ['work', 'voice'] }, 'text', '+1-650-253-0000'],
            ],
          ],
        },
      ],
    },
  ],
  port43: 'whois.arin.net',
};

/** Shaped from the live rdap.arin.net reply for AS15169. */
const autnumResponse = {
  objectClassName: 'autnum',
  handle: 'AS15169',
  startAutnum: 15169,
  endAutnum: 15169,
  name: 'GOOGLE',
  status: ['active'],
  events: [
    { eventAction: 'registration', eventDate: '2000-03-30T00:00:00-05:00' },
    { eventAction: 'last changed', eventDate: '2012-02-24T09:44:34-05:00' },
  ],
  entities: [
    {
      handle: 'GOGL',
      roles: ['registrant'],
      vcardArray: [
        'vcard',
        [
          ['version', {}, 'text', '4.0'],
          ['fn', {}, 'text', 'Google LLC'],
        ],
      ],
      entities: [
        {
          handle: 'ABUSE5250-ARIN',
          roles: ['abuse'],
          vcardArray: [
            'vcard',
            [
              ['version', {}, 'text', '4.0'],
              ['email', {}, 'text', 'network-abuse@google.com'],
            ],
          ],
        },
      ],
    },
  ],
  port43: 'whois.arin.net',
};

describe('WHOIS connector', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('metadata', () => {
    it('exposes the expected id, display name, and description', () => {
      expect(Whois.metadata.id).toBe('.whois');
      expect(Whois.metadata.displayName).toBe('WHOIS');
      expect(Whois.metadata.description.length).toBeGreaterThan(0);
    });

    it('supports both workflows and agentBuilder', () => {
      expect(Whois.metadata.supportedFeatureIds).toEqual(['workflows', 'agentBuilder']);
    });

    it('uses a built-in EUI icon instead of a custom brand mark', () => {
      // WHOIS is a protocol with no vendor logo. Setting metadata.icon also means the spec
      // must be absent from ConnectorIconsMap; connector_spec_contract.test.ts enforces that.
      expect(Whois.metadata.icon).toBe('globe');
    });

    it('offers an unauthenticated path plus an optional gateway key', () => {
      const authTypes = (Whois.auth?.types ?? []).map((type) =>
        typeof type === 'string' ? type : type.type
      );
      expect(authTypes).toEqual(['none', 'api_key_header']);
    });

    it('marks the base URL for allowedHosts enforcement at save time', () => {
      // The load-bearing assertion is the field-level `validate.allowedHosts` meta: that is
      // what generate_config_schema reads to install the ensureUriAllowed check. Asserting
      // only the spec-level validateUrls list would pass without any enforcement existing.
      const baseUrl = Whois.schema?.shape.baseUrl;
      const meta = baseUrl?.meta() as { validate?: { allowedHosts?: boolean } } | undefined;
      expect(meta?.validate?.allowedHosts).toBe(true);
      expect(Whois.validateUrls?.fields).toContain('baseUrl');
    });

    it('exposes every action as a tool, since all of them are reads', () => {
      for (const [name, action] of Object.entries(Whois.actions)) {
        expect({ name, isTool: action.isTool }).toEqual({ name, isTool: true });
      }
    });

    it('gives every action a substantive description', () => {
      for (const [name, action] of Object.entries(Whois.actions)) {
        expect({ name, described: (action.description ?? '').length > 50 }).toEqual({
          name,
          described: true,
        });
      }
    });

    it('enables the connectivity test', () => {
      expect(Whois.test.enabled).toBe(true);
    });
  });

  describe('lookupDomain', () => {
    it('GETs the bootstrap domain path with the RDAP media type', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: domainResponse });

      await Whois.actions.lookupDomain.handler(ctx, { domain: 'elastic.com' });

      expect(client.get).toHaveBeenCalledTimes(1);
      expect(client.get).toHaveBeenCalledWith('https://rdap.org/domain/elastic.com', RDAP_HEADERS);
    });

    it('honours a configured base URL', async () => {
      const { ctx, client } = createContext({ baseUrl: 'https://rdap.verisign.com/com/v1' });
      client.get.mockResolvedValue({ data: domainResponse });

      await Whois.actions.lookupDomain.handler(ctx, { domain: 'elastic.com' });

      expect(client.get).toHaveBeenCalledWith(
        'https://rdap.verisign.com/com/v1/domain/elastic.com',
        RDAP_HEADERS
      );
    });

    it('lets a per-call baseUrl override the configured one', async () => {
      const { ctx, client } = createContext({ baseUrl: 'https://rdap.org' });
      client.get.mockResolvedValue({ data: domainResponse });

      await Whois.actions.lookupDomain.handler(ctx, {
        domain: 'elastic.com',
        baseUrl: 'https://rdap.arin.net/registry',
      });

      expect(client.get).toHaveBeenCalledWith(
        'https://rdap.arin.net/registry/domain/elastic.com',
        RDAP_HEADERS
      );
    });

    it('strips a trailing slash from the base URL so the path has no double slash', async () => {
      const { ctx, client } = createContext({ baseUrl: 'https://rdap.org/' });
      client.get.mockResolvedValue({ data: domainResponse });

      await Whois.actions.lookupDomain.handler(ctx, { domain: 'elastic.com' });

      expect(client.get).toHaveBeenCalledWith('https://rdap.org/domain/elastic.com', RDAP_HEADERS);
    });

    it('sends a punycoded A-label through unchanged', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: domainResponse });

      await Whois.actions.lookupDomain.handler(ctx, { domain: 'xn--80ak6aa92e.com' });

      expect(client.get).toHaveBeenCalledWith(
        'https://rdap.org/domain/xn--80ak6aa92e.com',
        RDAP_HEADERS
      );
    });

    it('projects the registrar, dates, nameservers, and abuse contact', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: domainResponse });

      const result = (await Whois.actions.lookupDomain.handler(ctx, {
        domain: 'elastic.com',
      })) as Record<string, unknown>;

      expect(result).toMatchObject({
        found: true,
        queryType: 'domain',
        domain: 'ELASTIC.COM',
        handle: '133013863_DOMAIN_COM-VRSN',
        status: ['client delete prohibited', 'client transfer prohibited'],
        registrationDate: '2004-10-16T18:08:31Z',
        expirationDate: '2026-10-16T18:08:31Z',
        lastChangedDate: '2024-10-26T03:31:33Z',
        registrar: { name: 'GoDaddy.com, LLC', handle: '146', ianaId: '146' },
        registrant: {
          handle: 'REG-123',
          name: 'REDACTED FOR PRIVACY',
          organization: 'Elasticsearch BV',
          country: 'NL',
        },
        // Published as a child of the registrar entity, not a sibling.
        abuseContact: { email: 'abuse@godaddy.com', phone: '480-624-2505' },
        nameservers: [
          { ldhName: 'NS1-34.AZURE-DNS.COM' },
          { ldhName: 'NS2-34.AZURE-DNS.NET', ipAddresses: { v4: ['1.2.3.4'] } },
        ],
        dnssec: false,
        port43: 'whois.verisign-grs.com',
      });
    });

    it('drops the notices, links, and rdapConformance boilerplate', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: domainResponse });

      const result = (await Whois.actions.lookupDomain.handler(ctx, {
        domain: 'elastic.com',
      })) as Record<string, unknown>;

      expect(result.notices).toBeUndefined();
      expect(result.links).toBeUndefined();
      expect(result.rdapConformance).toBeUndefined();
      expect(result.raw).toBeUndefined();
    });

    it('computes ageInDays and daysUntilExpiry from the event dates', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-06T00:00:00Z'));
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: domainResponse });

      const result = (await Whois.actions.lookupDomain.handler(ctx, {
        domain: 'elastic.com',
      })) as { ageInDays: number; daysUntilExpiry: number };

      // 2004-10-16T18:08:31Z to 2026-08-06T00:00:00Z, floored to whole days.
      expect(result.ageInDays).toBe(7963);
      // 2026-08-06T00:00:00Z to 2026-10-16T18:08:31Z, floored the same way.
      expect(result.daysUntilExpiry).toBe(71);
    });

    it('reports a negative daysUntilExpiry for an already-expired domain', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2027-01-01T00:00:00Z'));
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: domainResponse });

      const result = (await Whois.actions.lookupDomain.handler(ctx, {
        domain: 'elastic.com',
      })) as { daysUntilExpiry: number };

      expect(result.daysUntilExpiry).toBeLessThan(0);
    });

    it('omits the computed ages when the registry publishes no dates', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: { objectClassName: 'domain', ldhName: 'bare.com' } });

      const result = (await Whois.actions.lookupDomain.handler(ctx, {
        domain: 'bare.com',
      })) as Record<string, unknown>;

      expect(result).toMatchObject({
        found: true,
        domain: 'bare.com',
        status: [],
        nameservers: [],
        dnssec: false,
      });
      expect(result.ageInDays).toBeUndefined();
      expect(result.daysUntilExpiry).toBeUndefined();
      expect(result.registrar).toBeUndefined();
      expect(result.registrant).toBeUndefined();
      expect(result.abuseContact).toBeUndefined();
    });

    it('reports dnssec true when the delegation is signed', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: { ...domainResponse, secureDNS: { delegationSigned: true, zoneSigned: true } },
      });

      const result = (await Whois.actions.lookupDomain.handler(ctx, {
        domain: 'elastic.com',
      })) as { dnssec: boolean };

      expect(result.dnssec).toBe(true);
    });

    it('attaches the full record when includeRaw is set', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: domainResponse });

      const result = (await Whois.actions.lookupDomain.handler(ctx, {
        domain: 'elastic.com',
        includeRaw: true,
      })) as { raw: unknown; found: boolean };

      expect(result.found).toBe(true);
      expect(result.raw).toEqual(domainResponse);
    });

    it('returns found:false on a 404 rather than throwing', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(404));

      const result = (await Whois.actions.lookupDomain.handler(ctx, {
        domain: 'nonexistent99xyz.com',
      })) as Record<string, unknown>;

      expect(result).toEqual({
        found: false,
        queryType: 'domain',
        query: 'nonexistent99xyz.com',
        message: expect.stringContaining('HTTP 404'),
      });
    });

    it('surfaces the registry error title and description on a 400', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(
        httpError(400, {
          errorCode: 400,
          title: 'Bad Request',
          description: ['Unsupported query type'],
        })
      );

      await expect(
        Whois.actions.lookupDomain.handler(ctx, { domain: 'elastic.com' })
      ).rejects.toThrow('RDAP error (400): Bad Request: Unsupported query type');
    });

    it('falls back to the raw error body when the registry sends no RDAP error object', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(429, { retryAfter: 60 }));

      await expect(
        Whois.actions.lookupDomain.handler(ctx, { domain: 'elastic.com' })
      ).rejects.toThrow('RDAP error (429): {"retryAfter":60}');
    });

    it('still reports the status when the error body is empty', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(503, ''));

      await expect(
        Whois.actions.lookupDomain.handler(ctx, { domain: 'elastic.com' })
      ).rejects.toThrow('RDAP error (503): the registry returned no error detail');
    });

    it('rethrows a transport error that never reached the registry', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        Whois.actions.lookupDomain.handler(ctx, { domain: 'elastic.com' })
      ).rejects.toThrow('ECONNREFUSED');
    });
  });

  describe('lookupIp', () => {
    it('GETs the IP path with an unencoded IPv4 literal', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: ipResponse });

      await Whois.actions.lookupIp.handler(ctx, { ip: '8.8.8.8' });

      expect(client.get).toHaveBeenCalledWith('https://rdap.org/ip/8.8.8.8', RDAP_HEADERS);
    });

    it('leaves IPv6 colons unencoded, since encoding them makes registries 400', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: ipResponse });

      await Whois.actions.lookupIp.handler(ctx, { ip: '2001:4860:4860::8888' });

      const [url] = client.get.mock.calls[0];
      expect(url).toBe('https://rdap.org/ip/2001:4860:4860::8888');
      // The bug this guards against: encodeURIComponent would send %3A and get a 400 back.
      expect(url).not.toContain('%3A');
    });

    it('leaves a CIDR slash unencoded, since encoding it makes registries 400', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: ipResponse });

      await Whois.actions.lookupIp.handler(ctx, { ip: '8.8.8.0/24' });

      const [url] = client.get.mock.calls[0];
      expect(url).toBe('https://rdap.org/ip/8.8.8.0/24');
      expect(url).not.toContain('%2F');
    });

    it('projects the netblock, holder, origin AS, and abuse contact', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: ipResponse });

      const result = (await Whois.actions.lookupIp.handler(ctx, { ip: '8.8.8.8' })) as Record<
        string,
        unknown
      >;

      expect(result).toMatchObject({
        found: true,
        queryType: 'ip',
        handle: 'NET-8-8-8-0-2',
        netName: 'GOGL',
        startAddress: '8.8.8.0',
        endAddress: '8.8.8.255',
        // Flattened from the cidr0 extension's prefix/length pair.
        cidr: ['8.8.8.0/24'],
        ipVersion: 'v4',
        allocationType: 'DIRECT ALLOCATION',
        parentHandle: 'NET-8-0-0-0-0',
        status: ['active'],
        // From ARIN's originas0 extension: feeds straight into lookupAsn.
        originAutnums: [15169],
        organization: { handle: 'GOGL', name: 'Google LLC' },
        abuseContact: { email: 'network-abuse@google.com', phone: '+1-650-253-0000' },
        port43: 'whois.arin.net',
      });
    });

    it('flattens an IPv6 cidr0 prefix', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: { ...ipResponse, cidr0_cidrs: [{ v6prefix: '2001:4860::', length: 32 }] },
      });

      const result = (await Whois.actions.lookupIp.handler(ctx, {
        ip: '2001:4860:4860::8888',
      })) as { cidr: string[] };

      expect(result.cidr).toEqual(['2001:4860::/32']);
    });

    it('carries the holder address ARIN publishes as a label, where country is unavailable', async () => {
      // ARIN leaves the structured jCard address array empty and puts the whole location in the
      // row's `label` param, so there is no ISO country code to read. Verified live against
      // 8.8.8.8, whose real record this fixture mirrors: the analyst would otherwise get no
      // location at all for any ARIN-registered address.
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: ipResponse });

      const result = (await Whois.actions.lookupIp.handler(ctx, { ip: '8.8.8.8' })) as {
        organization: { address?: string; country?: string };
      };

      expect(result.organization.country).toBeUndefined();
      expect(result.organization.address).toBe(
        '1600 Amphitheatre Parkway\nMountain View\nCA\n94043\nUnited States'
      );
    });

    it('prefers the top-level country an RIR publishes', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: { ...ipResponse, country: 'NL' } });

      const result = (await Whois.actions.lookupIp.handler(ctx, { ip: '193.0.6.139' })) as {
        country: string;
      };

      expect(result.country).toBe('NL');
    });

    it('falls back to the holder vCard country when the RIR omits the top-level one', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: {
          ...ipResponse,
          entities: [
            {
              handle: 'ORG-1',
              roles: ['registrant'],
              vcardArray: [
                'vcard',
                [
                  ['fn', {}, 'text', 'Example Org'],
                  ['adr', {}, 'text', ['', '', '', 'Berlin', '', '10115', 'DE']],
                ],
              ],
            },
          ],
        },
      });

      const result = (await Whois.actions.lookupIp.handler(ctx, { ip: '8.8.8.8' })) as {
        country: string;
      };

      expect(result.country).toBe('DE');
    });

    it('treats the first entity as the holder when no registrant role is published', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: {
          ...ipResponse,
          entities: [
            {
              handle: 'NO-ROLE',
              vcardArray: ['vcard', [['fn', {}, 'text', 'Unlabelled Holder']]],
            },
          ],
        },
      });

      const result = (await Whois.actions.lookupIp.handler(ctx, { ip: '8.8.8.8' })) as {
        organization: { handle: string; name: string };
      };

      expect(result.organization).toMatchObject({ handle: 'NO-ROLE', name: 'Unlabelled Holder' });
    });

    it('finds a top-level abuse contact, not just a nested one', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: {
          ...ipResponse,
          entities: [
            {
              handle: 'ABUSE-TOP',
              roles: ['abuse'],
              vcardArray: ['vcard', [['email', {}, 'text', 'abuse@example.net']]],
            },
          ],
        },
      });

      const result = (await Whois.actions.lookupIp.handler(ctx, { ip: '8.8.8.8' })) as {
        abuseContact: { email: string };
      };

      expect(result.abuseContact.email).toBe('abuse@example.net');
    });

    it('omits abuseContact when the abuse entity publishes no reachable detail', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: { ...ipResponse, entities: [{ handle: 'ABUSE-EMPTY', roles: ['abuse'] }] },
      });

      const result = (await Whois.actions.lookupIp.handler(ctx, { ip: '8.8.8.8' })) as Record<
        string,
        unknown
      >;

      expect(result.abuseContact).toBeUndefined();
    });

    it('defaults originAutnums to an empty array outside ARIN', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: { ...ipResponse, arin_originas0_originautnums: undefined },
      });

      const result = (await Whois.actions.lookupIp.handler(ctx, { ip: '8.8.8.8' })) as {
        originAutnums: number[];
      };

      expect(result.originAutnums).toEqual([]);
    });

    it('returns found:false on a 404', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(404));

      const result = (await Whois.actions.lookupIp.handler(ctx, { ip: '203.0.113.1' })) as {
        found: boolean;
        queryType: string;
        query: string;
      };

      expect(result).toMatchObject({ found: false, queryType: 'ip', query: '203.0.113.1' });
    });

    it('throws on a non-404 error', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(500, { title: 'Internal Server Error' }));

      await expect(Whois.actions.lookupIp.handler(ctx, { ip: '8.8.8.8' })).rejects.toThrow(
        'RDAP error (500): Internal Server Error'
      );
    });
  });

  describe('lookupAsn', () => {
    it('GETs the autnum path with a bare number', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: autnumResponse });

      await Whois.actions.lookupAsn.handler(ctx, { asn: '15169' });

      expect(client.get).toHaveBeenCalledWith('https://rdap.org/autnum/15169', RDAP_HEADERS);
    });

    it('strips an uppercase AS prefix, which registries reject in the path', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: autnumResponse });

      await Whois.actions.lookupAsn.handler(ctx, { asn: 'AS15169' });

      expect(client.get).toHaveBeenCalledWith('https://rdap.org/autnum/15169', RDAP_HEADERS);
    });

    it('strips a lowercase as prefix too', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: autnumResponse });

      await Whois.actions.lookupAsn.handler(ctx, { asn: 'as15169' });

      expect(client.get).toHaveBeenCalledWith('https://rdap.org/autnum/15169', RDAP_HEADERS);
    });

    it('projects the AS name, range, holder, and abuse contact', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: autnumResponse });

      const result = (await Whois.actions.lookupAsn.handler(ctx, { asn: 'AS15169' })) as Record<
        string,
        unknown
      >;

      expect(result).toMatchObject({
        found: true,
        queryType: 'autnum',
        handle: 'AS15169',
        asName: 'GOOGLE',
        startAutnum: 15169,
        endAutnum: 15169,
        status: ['active'],
        registrationDate: '2000-03-30T00:00:00-05:00',
        lastChangedDate: '2012-02-24T09:44:34-05:00',
        organization: { handle: 'GOGL', name: 'Google LLC' },
        abuseContact: { email: 'network-abuse@google.com' },
        port43: 'whois.arin.net',
      });
    });

    it('reports the stripped number in a found:false result', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(404));

      const result = (await Whois.actions.lookupAsn.handler(ctx, { asn: 'AS4294967290' })) as {
        found: boolean;
        query: string;
      };

      expect(result).toMatchObject({ found: false, query: '4294967290' });
    });
  });

  describe('lookupNameserver', () => {
    it('GETs the nameserver path and projects the glue addresses', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: {
          objectClassName: 'nameserver',
          ldhName: 'NS1.GOOGLE.COM',
          ipAddresses: { v4: ['216.239.32.10'], v6: ['2001:4860:4802:32::A'] },
        },
      });

      const result = (await Whois.actions.lookupNameserver.handler(ctx, {
        nameserver: 'ns1.google.com',
      })) as Record<string, unknown>;

      expect(client.get).toHaveBeenCalledWith(
        'https://rdap.org/nameserver/ns1.google.com',
        RDAP_HEADERS
      );
      expect(result).toMatchObject({
        found: true,
        queryType: 'nameserver',
        ldhName: 'NS1.GOOGLE.COM',
        ipAddresses: { v4: ['216.239.32.10'], v6: ['2001:4860:4802:32::A'] },
        status: [],
      });
    });

    it('defaults ipAddresses to an empty object when no glue is registered', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: { objectClassName: 'nameserver', ldhName: 'NS1.EXAMPLE.COM' },
      });

      const result = (await Whois.actions.lookupNameserver.handler(ctx, {
        nameserver: 'ns1.example.com',
      })) as { ipAddresses: Record<string, unknown> };

      expect(result.ipAddresses).toEqual({});
    });

    it('returns found:false on a 404, which is common for nameservers', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(404));

      const result = (await Whois.actions.lookupNameserver.handler(ctx, {
        nameserver: 'ns1.example.com',
      })) as { found: boolean; queryType: string };

      expect(result).toMatchObject({ found: false, queryType: 'nameserver' });
    });
  });

  describe('lookupEntity', () => {
    it('GETs the entity path with the handle', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: ipResponse.entities[0] });

      await Whois.actions.lookupEntity.handler(ctx, { handle: 'ABUSE5250-ARIN' });

      expect(client.get).toHaveBeenCalledWith(
        'https://rdap.org/entity/ABUSE5250-ARIN',
        RDAP_HEADERS
      );
    });

    it('flattens the jCard and one level of child contacts', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: {
          ...ipResponse.entities[0],
          events: [
            { eventAction: 'registration', eventDate: '2000-03-30T00:00:00-05:00' },
            { eventAction: 'last changed', eventDate: '2019-10-31T15:45:45-04:00' },
          ],
        },
      });

      const result = (await Whois.actions.lookupEntity.handler(ctx, {
        handle: 'GOGL',
        baseUrl: 'https://rdap.arin.net/registry',
      })) as Record<string, unknown>;

      expect(client.get).toHaveBeenCalledWith(
        'https://rdap.arin.net/registry/entity/GOGL',
        RDAP_HEADERS
      );
      expect(result).toMatchObject({
        found: true,
        queryType: 'entity',
        handle: 'GOGL',
        roles: ['registrant'],
        name: 'Google LLC',
        // ARIN puts the address in the adr row's `label` param, not the structured array.
        address: '1600 Amphitheatre Parkway\nMountain View\nCA\n94043\nUnited States',
        registrationDate: '2000-03-30T00:00:00-05:00',
        lastChangedDate: '2019-10-31T15:45:45-04:00',
        childEntities: [
          {
            handle: 'ABUSE5250-ARIN',
            roles: ['abuse'],
            name: 'Abuse',
            organization: 'Google Inc.',
            email: 'network-abuse@google.com',
            phone: '+1-650-253-0000',
          },
        ],
      });
    });

    it('strips the tel: URI scheme so phone numbers have one shape', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: {
          handle: 'REG-1',
          roles: ['registrar'],
          vcardArray: ['vcard', [['tel', { type: 'voice' }, 'uri', 'tel:480-624-2505']]],
        },
      });

      const result = (await Whois.actions.lookupEntity.handler(ctx, { handle: 'REG-1' })) as {
        phone: string;
      };

      expect(result.phone).toBe('480-624-2505');
    });

    it('reads the structured adr array when there is no label param', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: {
          handle: 'REG-2',
          vcardArray: [
            'vcard',
            [['adr', {}, 'text', ['', '', 'Keizersgracht 1', 'Amsterdam', '', '1015', 'NL']]],
          ],
        },
      });

      const result = (await Whois.actions.lookupEntity.handler(ctx, { handle: 'REG-2' })) as {
        address: string;
        country: string;
      };

      expect(result.address).toBe('Keizersgracht 1, Amsterdam, 1015, NL');
      expect(result.country).toBe('NL');
    });

    it('surfaces the IANA registrar id when the entity is a registrar', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({
        data: {
          handle: '146',
          roles: ['registrar'],
          publicIds: [{ type: 'IANA Registrar ID', identifier: '146' }],
        },
      });

      const result = (await Whois.actions.lookupEntity.handler(ctx, { handle: '146' })) as {
        ianaRegistrarId: string;
      };

      expect(result.ianaRegistrarId).toBe('146');
    });

    it('returns found:false on a 404', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(404));

      const result = (await Whois.actions.lookupEntity.handler(ctx, { handle: 'NOPE-ARIN' })) as {
        found: boolean;
        queryType: string;
      };

      expect(result).toMatchObject({ found: false, queryType: 'entity' });
    });
  });

  describe('test handler', () => {
    it('calls the RDAP /help capability endpoint', async () => {
      const { ctx, client } = createContext();
      client.get.mockResolvedValue({ data: { rdapConformance: ['rdap_level_0'] } });

      const result = await Whois.test.handler(ctx);

      expect(client.get).toHaveBeenCalledWith('https://rdap.org/help', RDAP_HEADERS);
      // Resolving is the success signal. ConnectorTestHandlerResult forbids an `ok` key so the
      // legacy `{ ok: false }` failure shape cannot be expressed.
      expect(result).toMatchObject({ rdapServer: 'https://rdap.org' });
      expect(result.ok).toBeUndefined();
    });

    it('probes the configured base URL rather than the default', async () => {
      const { ctx, client } = createContext({ baseUrl: 'https://rdap.arin.net/registry' });
      client.get.mockResolvedValue({ data: {} });

      await Whois.test.handler(ctx);

      expect(client.get).toHaveBeenCalledWith('https://rdap.arin.net/registry/help', RDAP_HEADERS);
    });

    it('throws when the server rejects the request, so the UI reports a failure', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(httpError(401, { title: 'Unauthorized' }));

      await expect(Whois.test.handler(ctx)).rejects.toThrow('RDAP error (401): Unauthorized');
    });

    it('throws when the server is unreachable', async () => {
      const { ctx, client } = createContext();
      client.get.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(Whois.test.handler(ctx)).rejects.toThrow('ENOTFOUND');
    });
  });

  describe('input schemas', () => {
    it('accepts a normal domain and rejects a scheme, path, or space', () => {
      expect(LookupDomainInputSchema.safeParse({ domain: 'example.com' }).success).toBe(true);
      expect(LookupDomainInputSchema.safeParse({ domain: 'xn--80ak6aa92e.com' }).success).toBe(
        true
      );
      expect(LookupDomainInputSchema.safeParse({ domain: 'https://example.com' }).success).toBe(
        false
      );
      expect(LookupDomainInputSchema.safeParse({ domain: 'example.com/path' }).success).toBe(false);
      expect(LookupDomainInputSchema.safeParse({ domain: 'exa mple.com' }).success).toBe(false);
      // A bare label is not a registrable domain.
      expect(LookupDomainInputSchema.safeParse({ domain: 'localhost' }).success).toBe(false);
      // A leading hyphen in a label breaks the LDH rule.
      expect(LookupDomainInputSchema.safeParse({ domain: '-bad.com' }).success).toBe(false);
    });

    it('bounds the domain at the 253-octet DNS limit', () => {
      const tooLong = `${'a'.repeat(60)}.${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(
        60
      )}.${'e'.repeat(20)}.com`;
      expect(tooLong.length).toBeGreaterThan(253);
      expect(LookupDomainInputSchema.safeParse({ domain: tooLong }).success).toBe(false);
    });

    it('rejects a unicode domain rather than mangling it', () => {
      // RDAP addresses an IDN by its A-label, so the caller must punycode first.
      expect(LookupDomainInputSchema.safeParse({ domain: 'пример.com' }).success).toBe(false);
    });

    it('requires an https base URL override', () => {
      expect(
        LookupDomainInputSchema.safeParse({
          domain: 'example.com',
          baseUrl: 'https://rdap.example.com/v1',
        }).success
      ).toBe(true);
      // Plain HTTP would leak the indicator under investigation.
      expect(
        LookupDomainInputSchema.safeParse({ domain: 'example.com', baseUrl: 'http://rdap.org' })
          .success
      ).toBe(false);
      expect(
        LookupDomainInputSchema.safeParse({
          domain: 'example.com',
          baseUrl: 'file:///etc/passwd',
        }).success
      ).toBe(false);
    });

    it('accepts IPv4, IPv6, and CIDR, and rejects a host name', () => {
      expect(LookupIpInputSchema.safeParse({ ip: '8.8.8.8' }).success).toBe(true);
      expect(LookupIpInputSchema.safeParse({ ip: '8.8.8.0/24' }).success).toBe(true);
      expect(LookupIpInputSchema.safeParse({ ip: '2001:4860:4860::8888' }).success).toBe(true);
      expect(LookupIpInputSchema.safeParse({ ip: '2001:db8::/32' }).success).toBe(true);
      expect(LookupIpInputSchema.safeParse({ ip: 'example.com' }).success).toBe(false);
      // A prefix length above 128 is meaningless.
      expect(LookupIpInputSchema.safeParse({ ip: '8.8.8.0/999' }).success).toBe(false);
      // Path-structural characters must not survive into the unencoded path segment.
      expect(LookupIpInputSchema.safeParse({ ip: '8.8.8.8?x=1' }).success).toBe(false);
      expect(LookupIpInputSchema.safeParse({ ip: '../../help' }).success).toBe(false);
    });

    it('accepts the compressed and v4-mapped IPv6 forms registries return', () => {
      expect(LookupIpInputSchema.safeParse({ ip: '::1' }).success).toBe(true);
      expect(LookupIpInputSchema.safeParse({ ip: '2001:db8::' }).success).toBe(true);
      expect(LookupIpInputSchema.safeParse({ ip: '::ffff:8.8.8.8' }).success).toBe(true);
      expect(
        LookupIpInputSchema.safeParse({ ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334' }).success
      ).toBe(true);
      expect(LookupIpInputSchema.safeParse({ ip: '2001:4860:4860::8888/128' }).success).toBe(true);
    });

    it('rejects a dot-run that would traverse out of the /ip/ path prefix', () => {
      // The IP is interpolated into the path WITHOUT percent-encoding, so a value made only of
      // permitted characters can still retarget the request: `..` resolves to the server root
      // and `../12` to /12, escaping /ip/ entirely. A charset-only bound let these through, so
      // the pattern matches the address structurally and every case below must be rejected.
      for (const ip of ['..', '../12', '.../24', '....', '...', '.:.', '.']) {
        expect({ ip, accepted: LookupIpInputSchema.safeParse({ ip }).success }).toEqual({
          ip,
          accepted: false,
        });
      }
    });

    it('accepts an ASN with or without the AS prefix and rejects a non-numeric one', () => {
      expect(LookupAsnInputSchema.safeParse({ asn: '15169' }).success).toBe(true);
      expect(LookupAsnInputSchema.safeParse({ asn: 'AS15169' }).success).toBe(true);
      expect(LookupAsnInputSchema.safeParse({ asn: 'as15169' }).success).toBe(true);
      expect(LookupAsnInputSchema.safeParse({ asn: 'ASN15169' }).success).toBe(false);
      expect(LookupAsnInputSchema.safeParse({ asn: '15169; DROP' }).success).toBe(false);
    });

    it('validates a nameserver host name like a domain', () => {
      expect(LookupNameserverInputSchema.safeParse({ nameserver: 'ns1.example.com' }).success).toBe(
        true
      );
      expect(LookupNameserverInputSchema.safeParse({ nameserver: 'ns1' }).success).toBe(false);
    });

    it('bounds and charset-constrains an entity handle', () => {
      expect(LookupEntityInputSchema.safeParse({ handle: 'GOGL' }).success).toBe(true);
      expect(LookupEntityInputSchema.safeParse({ handle: 'ABUSE5250-ARIN' }).success).toBe(true);
      expect(
        LookupEntityInputSchema.safeParse({ handle: '133013863_DOMAIN_COM-VRSN' }).success
      ).toBe(true);
      expect(LookupEntityInputSchema.safeParse({ handle: 'a/../help' }).success).toBe(false);
      expect(LookupEntityInputSchema.safeParse({ handle: 'x'.repeat(129) }).success).toBe(false);
    });

    it('leaves includeRaw unset so responses stay trimmed by default', () => {
      const parsed = LookupDomainInputSchema.safeParse({ domain: 'example.com' });
      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.includeRaw).toBeUndefined();
    });
  });
});
