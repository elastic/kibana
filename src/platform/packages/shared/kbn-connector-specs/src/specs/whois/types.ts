/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/**
 * A DNS name in LDH (letter-digit-hyphen) form, i.e. already punycoded. Bounded to the DNS
 * limit of 253 octets. The charset is constrained because the value becomes a URL path
 * segment: RDAP rejects a malformed name with a 400, but an unconstrained value could also
 * carry a `/` or `?` and reshape the request path.
 *
 * Unicode (IDN) names are deliberately rejected rather than silently mangled: RDAP addresses
 * an IDN by its A-label (`xn--...`), so a caller must punycode first.
 */
const DOMAIN_PATTERN = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$/;

/**
 * An IPv4/IPv6 literal, optionally with a CIDR prefix length. RDAP accepts both an address
 * and a CIDR block on the `/ip/` path, and both are useful during triage, so the schema
 * allows either. Validated by regex rather than `z.ipv4()`/`z.ipv6()` because those reject
 * the prefix-length suffix.
 *
 * The address part is matched structurally rather than as a charset, because the value is
 * interpolated into the request path WITHOUT percent-encoding (an IPv6 colon and a CIDR slash
 * are structural there, and encoding them makes registries 400). A bare charset bound is not
 * sufficient protection on its own: `..` and `../12` are both made only of permitted
 * characters, yet resolve away from the `/ip/` prefix and silently retarget the request. Each
 * alternative below therefore requires at least one digit-or-hex group, which no dot-run can
 * satisfy.
 */
const IPV4_PATTERN = '\\d{1,3}(\\.\\d{1,3}){3}';
const IPV6_PATTERN = '[0-9A-Fa-f]{0,4}(:[0-9A-Fa-f]{0,4}){2,7}(\\.\\d{1,3}){0,3}';
const IP_OR_CIDR_PATTERN = new RegExp(
  `^(${IPV4_PATTERN}|${IPV6_PATTERN})(\\/(?:[0-9]|[1-9][0-9]|1[01][0-9]|12[0-8]))?$`
);

/** An AS number, with or without the conventional `AS` prefix. */
const ASN_PATTERN = /^(AS|as)?\d{1,10}$/;

/**
 * An RDAP entity handle, e.g. `GOGL`, `ABUSE5250-ARIN`, or `133013863_DOMAIN_COM-VRSN`.
 * Handles are registry-assigned and their charset varies, so this is deliberately permissive
 * on characters while still excluding path-structural ones.
 */
const ENTITY_HANDLE_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Any RDAP server URL an action may be pointed at. Constrained to HTTPS: RDAP over plain
 * HTTP would leak the indicator being investigated, and an unconstrained scheme in a
 * config-supplied base URL is an SSRF vector.
 */
export const RdapBaseUrlSchema = z
  .string()
  .min(8)
  .max(512)
  .regex(/^https:\/\/[A-Za-z0-9.-]+(:\d{1,5})?(\/[A-Za-z0-9._~\-/]*)?$/, {
    message: 'Must be an https:// RDAP base URL, for example https://rdap.org',
  });

const rawRecord = () =>
  z
    .boolean()
    .optional()
    .describe(
      'Set true to include the full unparsed RDAP object under a "raw" key alongside the trimmed fields. Off by default because RDAP records are large (a single IP record runs to several KB of nested vCard arrays, notices, and link boilerplate) and will crowd out an agent context window. Only turn it on when a needed field is missing from the parsed output.'
    );

/**
 * A per-call server override. Note the interaction with the optional `api_key_header` auth
 * mode: that key is installed as a default header on the connector's HTTP client, so it is
 * sent to whichever host this override names. The Actions `allowedHosts` policy is enforced on
 * every request target before dispatch, so an operator using a gateway key should keep
 * `allowedHosts` restricted to their gateway rather than leaving it at `*`. Public RDAP needs
 * no credential at all, so the default auth mode carries nothing to leak.
 */
const baseUrlOverride = () =>
  RdapBaseUrlSchema.optional().describe(
    'Optional RDAP server base URL for this one call, overriding the connector default. Use it to query an authoritative registry server directly, for example https://rdap.verisign.com/com/v1 for a .com domain, when the bootstrap service does not cover the target. Only ever point this at a real RDAP registry or gateway.'
  );

export const LookupDomainInputSchema = lazySchema(() =>
  z.object({
    domain: z
      .string()
      .min(3)
      .max(253)
      .regex(DOMAIN_PATTERN, {
        message:
          'Must be a bare domain name in ASCII/punycode form, for example example.com or xn--80ak6aa92e.com. Do not include a scheme, port, or path.',
      })
      .describe(
        'The registrable domain name to look up, for example "example.com". Pass the bare domain: no scheme, no "www." unless it is genuinely part of the registration, no path. An internationalized name must already be punycoded to its xn-- A-label. Subdomains are not registrable, so query the apex ("example.com", not "mail.example.com").'
      ),
    baseUrl: baseUrlOverride(),
    includeRaw: rawRecord(),
  })
);
export type LookupDomainInput = z.infer<typeof LookupDomainInputSchema>;

export const LookupIpInputSchema = lazySchema(() =>
  z.object({
    ip: z
      .string()
      .min(2)
      .max(49)
      .regex(IP_OR_CIDR_PATTERN, {
        message:
          'Must be an IPv4 or IPv6 address, optionally with a CIDR prefix, for example 8.8.8.8, 8.8.8.0/24, or 2001:4860:4860::8888.',
      })
      .describe(
        'The IPv4 or IPv6 address to look up, for example "8.8.8.8" or "2001:4860:4860::8888". A CIDR block such as "8.8.8.0/24" also works. The registry answers with the netblock containing the address, so any address inside an allocation returns that allocation.'
      ),
    baseUrl: baseUrlOverride(),
    includeRaw: rawRecord(),
  })
);
export type LookupIpInput = z.infer<typeof LookupIpInputSchema>;

export const LookupAsnInputSchema = lazySchema(() =>
  z.object({
    asn: z
      .string()
      .min(1)
      .max(12)
      .regex(ASN_PATTERN, {
        message: 'Must be an AS number, for example 15169 or AS15169.',
      })
      .describe(
        'The autonomous system number to look up, with or without the "AS" prefix, for example "15169" or "AS15169". An entry of the originAutnums array on a lookupIp result feeds this directly.'
      ),
    baseUrl: baseUrlOverride(),
    includeRaw: rawRecord(),
  })
);
export type LookupAsnInput = z.infer<typeof LookupAsnInputSchema>;

export const LookupNameserverInputSchema = lazySchema(() =>
  z.object({
    nameserver: z
      .string()
      .min(3)
      .max(253)
      .regex(DOMAIN_PATTERN, {
        message:
          'Must be a nameserver host name in ASCII/punycode form, for example ns1.example.com.',
      })
      .describe(
        'The nameserver host name to look up, for example "ns1.example.com". The nameservers array on a lookupDomain result feeds this directly. Only nameservers registered as host objects in a registry resolve; many registries do not publish them at all.'
      ),
    baseUrl: baseUrlOverride(),
    includeRaw: rawRecord(),
  })
);
export type LookupNameserverInput = z.infer<typeof LookupNameserverInputSchema>;

export const LookupEntityInputSchema = lazySchema(() =>
  z.object({
    handle: z
      .string()
      .min(1)
      .max(128)
      .regex(ENTITY_HANDLE_PATTERN, {
        message: 'Must be an RDAP entity handle, for example GOGL or ABUSE5250-ARIN.',
      })
      .describe(
        'The registry-assigned entity handle, for example "GOGL" or "ABUSE5250-ARIN". Read it from the entities[].handle field of a lookupIp, lookupAsn, or lookupDomain result. A handle is only resolvable at the registry that issued it, so pass baseUrl when the handle came from a different registry than the connector default.'
      ),
    baseUrl: baseUrlOverride(),
    includeRaw: rawRecord(),
  })
);
export type LookupEntityInput = z.infer<typeof LookupEntityInputSchema>;

// --- RDAP response shapes (RFC 9083) -----------------------------------------------------
// Only the members this connector reads are modelled. RDAP is extensible and every member is
// optional in practice, so everything here is optional: the "Certain JSON properties might
// occasionally be missing" caveat applies to registry servers as much as to any vendor API.

/** A jCard (RFC 7095) property row: [name, params, valueType, value]. */
export type VcardEntry = [string, Record<string, unknown>, string, unknown];

export interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
  eventActor?: string;
}

export interface RdapEntity {
  objectClassName?: string;
  handle?: string;
  roles?: string[];
  vcardArray?: [string, VcardEntry[]];
  publicIds?: Array<{ type?: string; identifier?: string }>;
  entities?: RdapEntity[];
  events?: RdapEvent[];
  remarks?: Array<{ title?: string; description?: string[] }>;
  links?: Array<{ rel?: string; href?: string; type?: string; value?: string }>;
  status?: string[];
}

export interface RdapNameserver {
  objectClassName?: string;
  ldhName?: string;
  unicodeName?: string;
  handle?: string;
  ipAddresses?: { v4?: string[]; v6?: string[] };
  events?: RdapEvent[];
  status?: string[];
}

export interface RdapDomainResponse {
  objectClassName?: string;
  handle?: string;
  ldhName?: string;
  unicodeName?: string;
  status?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
  nameservers?: RdapNameserver[];
  secureDNS?: { delegationSigned?: boolean; zoneSigned?: boolean };
  port43?: string;
  rdapConformance?: string[];
}

export interface RdapIpResponse {
  objectClassName?: string;
  handle?: string;
  startAddress?: string;
  endAddress?: string;
  ipVersion?: string;
  name?: string;
  type?: string;
  country?: string;
  parentHandle?: string;
  status?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
  remarks?: Array<{ title?: string; description?: string[] }>;
  port43?: string;
  /** RFC 9083 cidr0 extension: the netblock in CIDR form rather than a start/end pair. */
  cidr0_cidrs?: Array<{ v4prefix?: string; v6prefix?: string; length?: number }>;
  /** ARIN originas0 extension: the AS numbers that originate this netblock. */
  arin_originas0_originautnums?: number[];
}

export interface RdapAutnumResponse {
  objectClassName?: string;
  handle?: string;
  startAutnum?: number;
  endAutnum?: number;
  name?: string;
  type?: string;
  country?: string;
  status?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
  port43?: string;
}
