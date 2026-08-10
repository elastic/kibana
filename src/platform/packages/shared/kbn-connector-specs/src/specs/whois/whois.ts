/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type {
  LookupAsnInput,
  LookupDomainInput,
  LookupEntityInput,
  LookupIpInput,
  LookupNameserverInput,
  RdapAutnumResponse,
  RdapDomainResponse,
  RdapEntity,
  RdapEvent,
  RdapIpResponse,
  RdapNameserver,
  VcardEntry,
} from './types';
import {
  LookupAsnInputSchema,
  LookupDomainInputSchema,
  LookupEntityInputSchema,
  LookupIpInputSchema,
  LookupNameserverInputSchema,
  RdapBaseUrlSchema,
} from './types';

/**
 * RDAP.org is an aggregating bootstrap server: it holds the registry of every known RDAP
 * service and 302-redirects a query to the authoritative one. That keeps this connector out
 * of the business of shipping and refreshing the IANA bootstrap files.
 */
const DEFAULT_RDAP_BASE_URL = 'https://rdap.org';

/**
 * Legacy WHOIS is a plain-text protocol on TCP port 43. Kibana connectors speak HTTP through
 * axios only, and Kibana egress almost always blocks raw TCP, so port 43 is not reachable
 * from here at all. RDAP over HTTPS is the only viable transport, which is why every action
 * in this connector is an RDAP call rather than a WHOIS one. RDAP is the IETF's replacement
 * for WHOIS (RFC 7480-7484, restated as RFC 9082/9083) and is mandatory for gTLD registries
 * and all five RIRs, so the coverage loss is limited to ccTLDs that never adopted it.
 */
const getBaseUrl = (ctx: ActionContext, override?: string): string => {
  const configured = (ctx.config?.baseUrl as string | undefined) ?? DEFAULT_RDAP_BASE_URL;
  const chosen = override ?? configured;
  // Trailing slashes would produce `//domain/x`, which some registry servers 404 on.
  return chosen.replace(/\/+$/, '');
};

/** RDAP responses are JSON but served under their own media type (RFC 9083 section 1.2). */
const RDAP_HEADERS = { Accept: 'application/rdap+json' } as const;

/**
 * Surface the registry's own error text. RDAP servers return an errorCode/title/description
 * body (RFC 9083 section 6); an unwrapped axios message says only "Request failed with
 * status code 400", which hides which part of the query the registry rejected.
 */
const throwWithApiError = (error: unknown): never => {
  const axiosError = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  const status = axiosError.response?.status;
  const data = axiosError.response?.data as
    | { errorCode?: number; title?: string; description?: string[] }
    | undefined;
  if (data?.title !== undefined || data?.description !== undefined) {
    const detail = [data.title, ...(data.description ?? [])].filter(Boolean).join(': ');
    throw new Error(`RDAP error (${status}): ${detail}`);
  }
  if (axiosError.response?.data !== undefined && axiosError.response.data !== '') {
    throw new Error(`RDAP error (${status}): ${JSON.stringify(axiosError.response.data)}`);
  }
  if (status !== undefined) {
    throw new Error(`RDAP error (${status}): the registry returned no error detail`);
  }
  throw error;
};

/**
 * An RDAP 404 means one of three different things, and the connector cannot tell them apart
 * because the bootstrap layer collapses them all into a bare 404 with an empty body
 * (confirmed live against rdap.org for an unregistered .com, and for elastic.co whose TLD
 * has no RDAP service at all):
 *   1. the object is genuinely unregistered/unallocated,
 *   2. the TLD or registry publishes no RDAP service,
 *   3. the name was malformed in a way the server treats as not-found.
 * Returning it as `{ found: false }` data rather than throwing is deliberate: a triage
 * workflow branching on "no record" must not have its run failed by a legitimate answer.
 * Every other status still throws.
 */
const isNotFound = (error: unknown): boolean =>
  (error as { response?: { status?: number } }).response?.status === 404;

const notFound = (queryType: string, query: string) => ({
  found: false as const,
  queryType,
  query,
  message:
    'No RDAP record was returned (HTTP 404). The object may be unregistered or unallocated, or its registry may not operate an RDAP service. RDAP does not distinguish these cases.',
});

/**
 * Read the rows of a jCard (RFC 7095): the array-of-arrays form RDAP uses for contact detail.
 * Each row is [name, params, valueType, value], so a value lives at index 3.
 */
const vcardRows = (entity: RdapEntity | undefined): VcardEntry[] => entity?.vcardArray?.[1] ?? [];

const vcardText = (entity: RdapEntity | undefined, name: string): string | undefined => {
  const row = vcardRows(entity).find((entry) => entry[0] === name);
  const value = row?.[3];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/**
 * A `tel` value arrives either as bare text or as a `tel:` URI depending on the registry, so
 * the scheme is stripped to give a workflow one consistent shape.
 */
const vcardPhone = (entity: RdapEntity | undefined): string | undefined => {
  const value = vcardText(entity, 'tel');
  return value?.replace(/^tel:/, '');
};

/**
 * ADR is the messiest jCard property. Registries either fill the 7-element structured array
 * (pobox, ext, street, locality, region, postcode, country) or leave it empty and put a
 * newline-joined address in the row's `label` parameter. ARIN does the latter, SIDN the
 * former, so both are read.
 */
const vcardAddress = (entity: RdapEntity | undefined): { address?: string; country?: string } => {
  const row = vcardRows(entity).find((entry) => entry[0] === 'adr');
  if (!row) {
    return {};
  }
  const label = row[1]?.label;
  const parts = Array.isArray(row[3])
    ? (row[3] as unknown[]).map((part) => String(part ?? ''))
    : [];
  const country = parts[6] !== undefined && parts[6].length > 0 ? parts[6] : undefined;
  const structured = parts.filter((part) => part.length > 0).join(', ');
  return {
    address: typeof label === 'string' && label.length > 0 ? label : structured || undefined,
    country,
  };
};

const ianaRegistrarId = (entity: RdapEntity | undefined): string | undefined =>
  entity?.publicIds?.find((id) => id.type === 'IANA Registrar ID')?.identifier;

/** The shared contact projection: who they are and how to reach them, without the jCard noise. */
const trimContact = (entity: RdapEntity) => {
  const { address, country } = vcardAddress(entity);
  return {
    handle: entity.handle,
    roles: entity.roles ?? [],
    name: vcardText(entity, 'fn'),
    organization: vcardText(entity, 'org'),
    email: vcardText(entity, 'email'),
    phone: vcardPhone(entity),
    address,
    country,
  };
};

/**
 * Flatten one entity plus one level of its children. The nesting matters: a registrar's abuse
 * contact is published as a child entity, not a sibling, so a flat projection would drop it.
 */
const trimEntity = (entity: RdapEntity) => ({
  ...trimContact(entity),
  ianaRegistrarId: ianaRegistrarId(entity),
  childEntities: (entity.entities ?? []).map(trimContact),
});

const findEntityByRole = (entities: RdapEntity[] | undefined, role: string) =>
  (entities ?? []).find((entity) => (entity.roles ?? []).includes(role));

/**
 * Find a contact by role anywhere in the first two entity levels. An abuse contact sits under
 * the registrar for a domain but at the top level for an IP netblock, so a single-level
 * search misses it half the time.
 */
const findNestedEntityByRole = (
  entities: RdapEntity[] | undefined,
  role: string
): RdapEntity | undefined => {
  const direct = findEntityByRole(entities, role);
  if (direct) {
    return direct;
  }
  for (const entity of entities ?? []) {
    const nested = findEntityByRole(entity.entities, role);
    if (nested) {
      return nested;
    }
  }
  return undefined;
};

/**
 * Returns undefined rather than an empty object when the registry publishes an abuse entity
 * with no reachable detail (verified live: example.com's registrar entity has an abuse role
 * but no email or phone). `abuseContact: {}` would read to a workflow as "there is a contact"
 * when there is nothing to send to.
 */
const abuseContactOf = (entities: RdapEntity[] | undefined) => {
  const abuse = findNestedEntityByRole(entities, 'abuse');
  if (!abuse) {
    return undefined;
  }
  const email = vcardText(abuse, 'email');
  const phone = vcardPhone(abuse);
  return email === undefined && phone === undefined ? undefined : { email, phone };
};

/**
 * The org that holds an allocation. RIRs disagree on how to mark it: RIPE and APNIC use the
 * `registrant` role, ARIN sometimes publishes the holder without one, so the first entity is
 * the fallback rather than returning nothing.
 */
const holderOf = (entities: RdapEntity[] | undefined): RdapEntity | undefined =>
  findEntityByRole(entities, 'registrant') ?? (entities ?? [])[0];

/**
 * `address` is included, not just `country`, because the two RIR styles are not
 * interchangeable. ARIN leaves the structured jCard address array empty and publishes the
 * whole location as a newline-joined `label` param, so a country code cannot be read from it
 * (verified live: 8.8.8.8's holder has `label` "1600 Amphitheatre Parkway\nMountain
 * View\nCA\n94043\nUnited States" and a 7-element array of empty strings). RIPE and APNIC do
 * publish a top-level ISO `country`. Rather than guess a code from the label's last line,
 * which would yield "United States" where another registry yields "NL" and break any workflow
 * comparing the field, `country` stays absent for ARIN space and `address` carries the
 * location the registry actually published.
 */
const organizationOf = (entity: RdapEntity | undefined) => {
  if (!entity) {
    return undefined;
  }
  const { address, country } = vcardAddress(entity);
  return {
    handle: entity.handle,
    name: vcardText(entity, 'fn'),
    organization: vcardText(entity, 'org'),
    address,
    country,
  };
};

/** Pull one dated event out of the RDAP events array by its eventAction name. */
const eventDate = (events: RdapEvent[] | undefined, action: string): string | undefined =>
  (events ?? []).find((event) => event.eventAction === action)?.eventDate;

const MS_PER_DAY = 86_400_000;

const parseIsoDate = (isoDate: string | undefined): number | undefined => {
  if (isoDate === undefined) {
    return undefined;
  }
  const parsed = Date.parse(isoDate);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * Age in whole elapsed days. Domain age is the most load-bearing signal in phishing triage
 * ("registered 3 days ago"), and computing it here saves every workflow from doing its own
 * date arithmetic on a string.
 */
const daysSince = (isoDate: string | undefined): number | undefined => {
  const parsed = parseIsoDate(isoDate);
  return parsed === undefined ? undefined : Math.floor((Date.now() - parsed) / MS_PER_DAY);
};

/**
 * Whole days remaining, negative once the date has passed so an expired domain reads as a
 * negative countdown. Floored in its own direction rather than by negating daysSince: negating
 * a floored negative rounds away from zero and would report 72 days left when only 71 full days
 * remain, which is the wrong way to be wrong for an expiry threshold.
 */
const daysUntil = (isoDate: string | undefined): number | undefined => {
  const parsed = parseIsoDate(isoDate);
  return parsed === undefined ? undefined : Math.floor((parsed - Date.now()) / MS_PER_DAY);
};

const trimNameserver = (nameserver: RdapNameserver) => ({
  ldhName: nameserver.ldhName,
  ipAddresses: nameserver.ipAddresses,
});

const withRaw = <T extends object>(trimmed: T, raw: unknown, includeRaw?: boolean) =>
  includeRaw === true ? { ...trimmed, raw } : trimmed;

/**
 * RDAP domain responses run 2-8 KB and are mostly boilerplate: `notices` alone (terms of
 * service, status-code glossary, ICANN complaint form) is often half the payload, and every
 * object repeats a `links` array of self-referencing URLs. Passing that through would burn an
 * agent's context for no analytical value, so only the triage-relevant members survive.
 */
const trimDomain = (data: RdapDomainResponse) => {
  const registrar = findEntityByRole(data.entities, 'registrar');
  const registrant = findEntityByRole(data.entities, 'registrant');
  const registrationDate = eventDate(data.events, 'registration');
  const expirationDate = eventDate(data.events, 'expiration');

  return {
    found: true as const,
    queryType: 'domain',
    domain: data.ldhName,
    unicodeName: data.unicodeName,
    handle: data.handle,
    status: data.status ?? [],
    registrationDate,
    expirationDate,
    lastChangedDate: eventDate(data.events, 'last changed'),
    // Both signals a triage rule actually branches on: a very young domain is suspicious, and
    // an already-expired one often means a dangling or hijacked delegation.
    ageInDays: daysSince(registrationDate),
    daysUntilExpiry: daysUntil(expirationDate),
    registrar: registrar
      ? {
          name: vcardText(registrar, 'fn'),
          handle: registrar.handle,
          ianaId: ianaRegistrarId(registrar),
        }
      : undefined,
    registrant: registrant
      ? {
          handle: registrant.handle,
          name: vcardText(registrant, 'fn'),
          organization: vcardText(registrant, 'org'),
          email: vcardText(registrant, 'email'),
          country: vcardAddress(registrant).country,
        }
      : undefined,
    abuseContact: abuseContactOf(data.entities),
    nameservers: (data.nameservers ?? []).map(trimNameserver),
    dnssec: data.secureDNS?.delegationSigned === true,
    port43: data.port43,
  };
};

/**
 * IP responses are the largest RDAP objects (the live 8.8.8.8 record is ~6.5 KB, mostly
 * nested vCard arrays and remark prose), so the same aggressive trim applies.
 */
const trimIp = (data: RdapIpResponse) => {
  const holder = holderOf(data.entities);
  const cidr = (data.cidr0_cidrs ?? [])
    .map((block) => {
      const prefix = block.v4prefix ?? block.v6prefix;
      return prefix !== undefined && block.length !== undefined
        ? `${prefix}/${block.length}`
        : undefined;
    })
    .filter((value): value is string => value !== undefined);

  return {
    found: true as const,
    queryType: 'ip',
    handle: data.handle,
    netName: data.name,
    startAddress: data.startAddress,
    endAddress: data.endAddress,
    cidr,
    ipVersion: data.ipVersion,
    allocationType: data.type,
    // `country` is a top-level member at the RIRs that publish it (RIPE, APNIC); ARIN does
    // not, so it falls back to the holder's vCard address.
    country: data.country ?? vcardAddress(holder).country,
    parentHandle: data.parentHandle,
    status: data.status ?? [],
    // ARIN's originas0 extension names the AS that announces the block. It is the handle to
    // pass straight into lookupAsn.
    originAutnums: data.arin_originas0_originautnums ?? [],
    registrationDate: eventDate(data.events, 'registration'),
    lastChangedDate: eventDate(data.events, 'last changed'),
    organization: organizationOf(holder),
    abuseContact: abuseContactOf(data.entities),
    port43: data.port43,
  };
};

const trimAutnum = (data: RdapAutnumResponse) => {
  const holder = holderOf(data.entities);

  return {
    found: true as const,
    queryType: 'autnum',
    handle: data.handle,
    asName: data.name,
    startAutnum: data.startAutnum,
    endAutnum: data.endAutnum,
    allocationType: data.type,
    country: data.country ?? vcardAddress(holder).country,
    status: data.status ?? [],
    registrationDate: eventDate(data.events, 'registration'),
    lastChangedDate: eventDate(data.events, 'last changed'),
    organization: organizationOf(holder),
    abuseContact: abuseContactOf(data.entities),
    port43: data.port43,
  };
};

export const Whois: ConnectorSpec = {
  metadata: {
    id: '.whois',
    displayName: 'WHOIS',
    description: i18n.translate('core.kibanaConnectorSpecs.whois.metadata.description', {
      defaultMessage:
        'Look up domain, IP, ASN, nameserver, and contact registration records over RDAP',
    }),
    // WHOIS is a protocol, not a vendor, so there is no brand mark to ship. A built-in EUI
    // glyph is used instead of a drawn logo, which also means this spec must NOT appear in
    // connector_icons_map.ts: the contract test asserts the map's keys equal exactly the set
    // of spec ids that have no metadata.icon.
    icon: 'globe',
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        // The default, and the reason this connector needs no setup: RDAP is an open,
        // unauthenticated protocol, so every action works with no credential at all.
        type: 'none',
        isRecommended: true,
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.whois.auth.none.label', {
            defaultMessage: 'No authentication (public RDAP)',
          }),
        },
      },
      {
        // For a commercial or private RDAP gateway that gates access behind a key. The key
        // rides as a request header on every call to the configured base URL; it does not
        // change the response shape, which stays RDAP.
        type: 'api_key_header',
        defaults: {},
        overrides: {
          label: i18n.translate('core.kibanaConnectorSpecs.whois.auth.apiKeyHeader.label', {
            defaultMessage: 'API key header (commercial RDAP gateway)',
          }),
          meta: {
            headerField: {
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.whois.auth.apiKeyHeader.headerField.helpText',
                {
                  defaultMessage:
                    'The header name your RDAP gateway expects, for example Authorization or X-Api-Key. Only a gateway needs this; public RDAP requires no credential.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      baseUrl: RdapBaseUrlSchema.default(DEFAULT_RDAP_BASE_URL)
        .describe('Base URL of the RDAP server or bootstrap service every lookup is sent to')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.whois.config.baseUrl.label', {
            defaultMessage: 'RDAP server URL',
          }),
          placeholder: DEFAULT_RDAP_BASE_URL,
          helpText: i18n.translate('core.kibanaConnectorSpecs.whois.config.baseUrl.helpText', {
            defaultMessage:
              'Defaults to https://rdap.org, a bootstrap service that redirects each query to the authoritative registry. Point it at one registry server, such as https://rdap.verisign.com/com/v1 or https://rdap.arin.net/registry, to skip the bootstrap hop, or at a commercial RDAP gateway. Must be https. Because the bootstrap service answers with a redirect to a registry host, a restrictive Kibana actions allowedHosts list must allow the registry hosts too.',
          }),
          // Enforces xpack.actions.allowedHosts when the connector is saved, so a disallowed
          // host is rejected at configuration time rather than at first execution.
          validate: { allowedHosts: true },
        }),
    })
  ),

  validateUrls: {
    fields: ['baseUrl'],
  },

  skill: `WHOIS registration data, served over RDAP (the IETF replacement for the port-43 WHOIS protocol). Use this connector to enrich a domain or address indicator during phishing and IOC triage.

Typical phishing triage flow:
1. lookupDomain on the domain from the alert. Read ageInDays: a domain registered days ago is a strong phishing signal. Read daysUntilExpiry for a dangling delegation, and status for registry locks or a pendingDelete.
2. lookupNameserver on an entry from the returned nameservers array if the delegation itself looks suspicious.
3. lookupEntity on the registrar or registrant handle if you need the full contact record behind it.

Typical IOC-address flow:
1. lookupIp on the address. Read organization for who controls the space, cidr for the allocation size, and abuseContact for where to report.
2. lookupAsn on an entry from originAutnums (or on an ASN from another tool) for the announcing network's own registration.
3. lookupEntity on a handle from either result to pull a specific contact's full record.

Gotchas that matter:
- A 404 comes back as data, not an error: check the found field. found: false means "no record returned", which conflates three cases RDAP cannot tell apart: unregistered/unallocated, the registry runs no RDAP service, or a malformed query. Branch on found rather than expecting a thrown error.
- RDAP coverage is not universal. Every gTLD (.com, .net, .org, .dev, .xyz) and all five RIRs serve RDAP, but many ccTLDs never adopted it: .co, .io, .de, .ru, .cn and roughly 235 others are absent from the IANA bootstrap registry and return found: false. That is a protocol gap, not a bug, and there is no fallback, because legacy WHOIS runs on TCP port 43 which Kibana cannot reach.
- Query the registrable apex, not a subdomain: lookupDomain on "mail.example.com" returns found: false because only "example.com" is registered.
- An internationalized domain must be punycoded to its xn-- form before you pass it.
- Registrant identity is usually redacted. Post-GDPR most registries return "REDACTED FOR PRIVACY" for the registrant name and email while still publishing the registrar, dates, nameservers, and status. Do not read a missing registrant as suspicious.
- country is not populated for every registry, so never treat its absence as a signal. RIPE and APNIC publish a top-level ISO country code; ARIN does not publish one at all, so for North American address space country is absent and the holder's location is in organization.address instead (a newline-joined postal address). Read organization.address as the fallback, and do not compare country across registries.
- Responses are trimmed to the triage-relevant fields on purpose. Set includeRaw: true on any action to also get the full RDAP object, but only when a field you need is genuinely missing: raw records are large and will crowd out your context.
- originAutnums is an ARIN-only extension and is often an empty array even at ARIN (verified for 8.8.8.8). When it is empty, get the announcing AS from another tool rather than assuming the address is unannounced.
- Pass baseUrl on an individual call to query one registry directly. Handles from lookupIp are only resolvable at the registry that issued them, so an ARIN handle such as GOGL needs baseUrl https://rdap.arin.net/registry on lookupEntity.`,

  actions: {
    lookupDomain: {
      isTool: true,
      description:
        'Look up the registration record for a domain name over RDAP. Returns the registrar, registration and expiry dates, a precomputed ageInDays and daysUntilExpiry, EPP status codes, nameservers, DNSSEC state, and whatever registrant and abuse contacts the registry publishes. ' +
        'The primary enrichment step in phishing triage: a domain with a small ageInDays was registered for this campaign. ' +
        'Query the registrable apex ("example.com"), not a subdomain. Returns found: false rather than failing when the registry has no record or serves no RDAP.',
      input: LookupDomainInputSchema,
      handler: async (ctx, input: LookupDomainInput) => {
        const baseUrl = getBaseUrl(ctx, input.baseUrl);
        try {
          const response = await ctx.client.get(
            `${baseUrl}/domain/${encodeURIComponent(input.domain)}`,
            { headers: RDAP_HEADERS }
          );
          const data = response.data as RdapDomainResponse;
          return withRaw(trimDomain(data), data, input.includeRaw);
        } catch (error) {
          if (isNotFound(error)) {
            return notFound('domain', input.domain);
          }
          return throwWithApiError(error);
        }
      },
    },

    lookupIp: {
      isTool: true,
      description:
        'Look up the registration record for an IPv4 or IPv6 address, or a CIDR block, over RDAP. Returns the owning organization, country, the netblock as CIDR plus its start and end addresses, the allocation type, the announcing AS numbers, and the abuse contact. ' +
        'Use it to enrich an IOC address with who controls the space before deciding how to handle an alert, and to get an address to report abuse to. ' +
        'Any address inside an allocation returns that whole allocation. Returns found: false rather than failing when the address is unallocated.',
      input: LookupIpInputSchema,
      handler: async (ctx, input: LookupIpInput) => {
        const baseUrl = getBaseUrl(ctx, input.baseUrl);
        try {
          // NOT percent-encoded, deliberately. An IPv6 literal's colons and a CIDR's slash
          // are structural in the RDAP path: encoding them makes registries reject the query
          // with a 400 (verified live against rdap.org for both `2001:4860:4860::8888` and
          // `8.8.8.0/24`). Safety comes from the input schema matching the address
          // structurally (see IP_OR_CIDR_PATTERN): every accepted value is a real IPv4/IPv6
          // literal with an optional `/NN`, so no dot-run such as `..` can traverse out of
          // this path prefix.
          const response = await ctx.client.get(`${baseUrl}/ip/${input.ip}`, {
            headers: RDAP_HEADERS,
          });
          const data = response.data as RdapIpResponse;
          return withRaw(trimIp(data), data, input.includeRaw);
        } catch (error) {
          if (isNotFound(error)) {
            return notFound('ip', input.ip);
          }
          return throwWithApiError(error);
        }
      },
    },

    lookupAsn: {
      isTool: true,
      description:
        'Look up the registration record for an autonomous system number over RDAP. Returns the AS name, the allocated range, the holding organization, country, and the abuse contact. ' +
        'Use it after lookupIp to identify the network that announces a suspect address: a bulletproof or high-abuse hosting AS is a stronger signal than one netblock on its own. ' +
        'Accepts "15169" or "AS15169". Returns found: false rather than failing when the number is unallocated.',
      input: LookupAsnInputSchema,
      handler: async (ctx, input: LookupAsnInput) => {
        const baseUrl = getBaseUrl(ctx, input.baseUrl);
        // RDAP addresses an autnum by its bare number: the `AS` prefix is a human convention
        // and a registry 404s on `/autnum/AS15169`.
        const asn = input.asn.replace(/^(AS|as)/, '');
        try {
          const response = await ctx.client.get(`${baseUrl}/autnum/${encodeURIComponent(asn)}`, {
            headers: RDAP_HEADERS,
          });
          const data = response.data as RdapAutnumResponse;
          return withRaw(trimAutnum(data), data, input.includeRaw);
        } catch (error) {
          if (isNotFound(error)) {
            return notFound('autnum', asn);
          }
          return throwWithApiError(error);
        }
      },
    },

    lookupNameserver: {
      isTool: true,
      description:
        'Look up a nameserver host object over RDAP. Returns its registered glue IP addresses (v4 and v6) and status. ' +
        'Use it to pivot from a suspicious domain to the infrastructure behind its delegation: several phishing domains sharing one nameserver is a campaign signal. ' +
        'Only nameservers registered as host objects resolve, and many registries publish none at all, so found: false is common here and is not an error.',
      input: LookupNameserverInputSchema,
      handler: async (ctx, input: LookupNameserverInput) => {
        const baseUrl = getBaseUrl(ctx, input.baseUrl);
        try {
          const response = await ctx.client.get(
            `${baseUrl}/nameserver/${encodeURIComponent(input.nameserver)}`,
            { headers: RDAP_HEADERS }
          );
          const data = response.data as RdapNameserver;
          const trimmed = {
            found: true as const,
            queryType: 'nameserver',
            ldhName: data.ldhName,
            unicodeName: data.unicodeName,
            handle: data.handle,
            ipAddresses: data.ipAddresses ?? {},
            status: data.status ?? [],
          };
          return withRaw(trimmed, data, input.includeRaw);
        } catch (error) {
          if (isNotFound(error)) {
            return notFound('nameserver', input.nameserver);
          }
          return throwWithApiError(error);
        }
      },
    },

    lookupEntity: {
      isTool: true,
      description:
        'Look up a contact or organization by its registry-assigned RDAP handle. Returns the name, organization, email, phone, address, country, roles, and any child contacts. ' +
        'Use it to expand a handle another lookup returned only as an identifier, for example to get a full abuse contact from an IP record. ' +
        'A handle is only resolvable at the registry that issued it, so pass that registry as baseUrl when the handle came from elsewhere.',
      input: LookupEntityInputSchema,
      handler: async (ctx, input: LookupEntityInput) => {
        const baseUrl = getBaseUrl(ctx, input.baseUrl);
        try {
          const response = await ctx.client.get(
            `${baseUrl}/entity/${encodeURIComponent(input.handle)}`,
            { headers: RDAP_HEADERS }
          );
          const data = response.data as RdapEntity;
          const trimmed = {
            found: true as const,
            queryType: 'entity',
            ...trimEntity(data),
            status: data.status ?? [],
            registrationDate: eventDate(data.events, 'registration'),
            lastChangedDate: eventDate(data.events, 'last changed'),
          };
          return withRaw(trimmed, data, input.includeRaw);
        } catch (error) {
          if (isNotFound(error)) {
            return notFound('entity', input.handle);
          }
          return throwWithApiError(error);
        }
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.whois.test.description', {
      defaultMessage:
        'Verifies the RDAP server is reachable, and any configured key accepted, by calling its /help endpoint',
    }),
    handler: async (ctx) => {
      const baseUrl = getBaseUrl(ctx);
      try {
        // /help is the RFC 9083 server-capability endpoint: the cheapest RDAP call there is.
        // It consumes no lookup quota and needs no valid indicator, so a failure here is
        // unambiguously "server unreachable or key rejected" rather than "bad query".
        await ctx.client.get(`${baseUrl}/help`, { headers: RDAP_HEADERS });
        // A resolved value is success; `ok` is deliberately absent, since ConnectorTestHandlerResult
        // forbids it to keep the legacy `{ ok: false }` failure shape unrepresentable.
        return {
          message: `Successfully reached the RDAP server at ${baseUrl}`,
          rdapServer: baseUrl,
        };
      } catch (error) {
        return throwWithApiError(error);
      }
    },
  },
};
