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
 * urlscan scan IDs are UUIDs. The value becomes a URL path segment on the result, screenshot,
 * and DOM endpoints, so it is charset-constrained here as well as encoded at the call site.
 */
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const uuid = () =>
  z
    .string()
    .length(36)
    .regex(UUID_PATTERN, { message: 'Must be a urlscan scan UUID.' })
    .describe(
      'The scan UUID, returned by scanUrl as "uuid" or by searchScans as "_id". For example 0e37e828-a9d9-45c0-ac50-1ca579b86c72.'
    );

/**
 * Restricted to http and https. urlscan only scans web URLs and rejects other schemes, and an
 * unconstrained scheme here would let a workflow input become a `file:` or `gopher:` request.
 */
const SUBMITTABLE_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

/**
 * Visibility is the single most consequential submission option: `public` puts the URL on the
 * urlscan front page and into everyone's search results.
 */
const VisibilitySchema = z
  .enum(['public', 'unlisted', 'private'])
  .describe(
    'Who can see the scan. "public" is listed on the urlscan front page and in public search results. "unlisted" is hidden from the public site but visible to vetted researchers, the right choice when the URL may carry PII. "private" is visible only to your account and team. Omit to use the account default.'
  );

export const ScanUrlInputSchema = lazySchema(() =>
  z.object({
    url: z
      .string()
      .min(8)
      .max(2048)
      .regex(SUBMITTABLE_URL_PATTERN, {
        message: 'Must be an http:// or https:// URL.',
      })
      .describe(
        'The URL to scan, including its scheme, for example "https://suspicious-login.example/verify". Must be http or https. The host must be publicly resolvable: urlscan rejects a non-resolving hostname with a 400 rather than attempting the scan.'
      ),
    visibility: VisibilitySchema.optional(),
    tags: z
      .array(z.string().min(1).max(64))
      .max(10)
      .optional()
      .describe(
        'Up to 10 free-form tags recorded on the scan, for example ["phishing", "case-4711"]. Useful to correlate a scan back to the alert or case that triggered it, since tags are searchable through task.tags.'
      ),
    referer: z
      .string()
      .max(2048)
      .regex(SUBMITTABLE_URL_PATTERN, { message: 'Must be an http:// or https:// URL.' })
      .optional()
      .describe(
        'Override the HTTP Referer the scanner sends. Set it when a phishing page only serves its payload to visitors arriving from a specific site.'
      ),
    customagent: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe(
        'Override the browser User-Agent for this scan. Set it when a page cloaks its content based on the client, for example to present as a mobile browser.'
      ),
    country: z
      .string()
      .length(2)
      .regex(/^[A-Za-z]{2}$/, { message: 'Must be a 2-letter ISO-3166-1 alpha-2 country code.' })
      .optional()
      .describe(
        'Two-letter ISO-3166-1 country code to scan from, for example "de". Set it when a page geofences its payload. Omit and urlscan picks a location from the URL TLD and server GeoIP.'
      ),
    overrideSafety: z
      .boolean()
      .optional()
      .describe(
        'Set true to disable urlscan\'s automatic reclassification of URLs that look like they contain PII. Use with care: it can make a URL carrying personal data public. Prefer visibility "unlisted" instead.'
      ),
  })
);
export type ScanUrlInput = z.infer<typeof ScanUrlInputSchema>;

export const ScanUrlAndWaitInputSchema = lazySchema(() =>
  z.object({
    url: z
      .string()
      .min(8)
      .max(2048)
      .regex(SUBMITTABLE_URL_PATTERN, { message: 'Must be an http:// or https:// URL.' })
      .describe(
        'The URL to scan and then wait for, including its scheme, for example "https://suspicious-login.example/verify".'
      ),
    visibility: VisibilitySchema.optional(),
    tags: z
      .array(z.string().min(1).max(64))
      .max(10)
      .optional()
      .describe('Up to 10 free-form tags recorded on the scan, for example ["phishing"].'),
    referer: z
      .string()
      .max(2048)
      .regex(SUBMITTABLE_URL_PATTERN, { message: 'Must be an http:// or https:// URL.' })
      .optional()
      .describe('Override the HTTP Referer the scanner sends.'),
    customagent: z
      .string()
      .min(1)
      .max(512)
      .optional()
      .describe('Override the browser User-Agent for this scan.'),
    country: z
      .string()
      .length(2)
      .regex(/^[A-Za-z]{2}$/, { message: 'Must be a 2-letter ISO-3166-1 alpha-2 country code.' })
      .optional()
      .describe('Two-letter ISO-3166-1 country code to scan from, for example "de".'),
    overrideSafety: z
      .boolean()
      .optional()
      .describe(
        'Set true to disable automatic PII reclassification. Prefer visibility "unlisted" instead.'
      ),
    timeoutSeconds: z
      .number()
      .int()
      .min(10)
      .max(180)
      .optional()
      .describe(
        'How long to keep polling for the result before giving up, in seconds (10 to 180, default 90). A typical scan finishes in 10 to 30 seconds; a heavy page can take longer. On timeout the action returns the uuid with completed: false so a workflow can poll getResult itself later rather than losing the scan.'
      ),
  })
);
export type ScanUrlAndWaitInput = z.infer<typeof ScanUrlAndWaitInputSchema>;

export const GetResultInputSchema = lazySchema(() =>
  z.object({
    uuid: uuid(),
    includeRequests: z
      .boolean()
      .optional()
      .describe(
        'Set true to also return a trimmed list of the HTTP requests the page made (URL, status, MIME type, IP, size). Off by default because a single page can make hundreds of requests, which would dominate an agent context. The contacted domains, IPs, and ASNs are always returned regardless.'
      ),
  })
);
export type GetResultInput = z.infer<typeof GetResultInputSchema>;

export const GetScanArtifactInputSchema = lazySchema(() =>
  z.object({
    uuid: uuid(),
  })
);
export type GetScanArtifactInput = z.infer<typeof GetScanArtifactInputSchema>;

export const GetDomInputSchema = lazySchema(() =>
  z.object({
    uuid: uuid(),
    maxLength: z
      .number()
      .int()
      .min(1000)
      .max(500_000)
      .optional()
      .describe(
        'Maximum number of characters of DOM to return (1000 to 500000, default 50000). A rendered DOM is frequently over a megabyte, so it is truncated by default; the response reports whether truncation happened and the full length.'
      ),
  })
);
export type GetDomInput = z.infer<typeof GetDomInputSchema>;

export const SearchScansInputSchema = lazySchema(() =>
  z.object({
    q: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Elasticsearch query-string query over historical scans. Examples: "page.domain:example.com", "ip:8.8.8.8", "hash:<sha256>", "page.asn:AS15169", "task.url:\\"https://example.com/login\\"", "domain:example.com AND date:>now-7d". Field names come from the urlscan search reference: page.domain, task.url, ip, asn, hash, country, filename, page.title, page.tlsIssuer, task.tags. Bound the query by date where you can, since an unbounded query is slow and burns quota.'
      ),
    size: z
      .number()
      .int()
      .min(1)
      .max(10_000)
      .optional()
      .describe(
        "Number of results to return (1 to 10000, default 100). The effective cap is your subscription tier, and urlscan silently returns fewer rather than erroring: an unauthenticated caller asking for 101 gets 100. Check the quota action's maxSearchResults for your real ceiling."
      ),
    searchAfter: z
      .string()
      .max(256)
      // urlscan enforces its own pattern server-side and leaked it verbatim in a 400:
      // /^\d{13},[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      // Mirrored here so a hand-built cursor is refused locally with a useful message
      // rather than passing validation and 400ing at the vendor.
      .regex(
        /^\d{13},[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
        {
          message:
            'Must be the comma-joined sort value of the last result, for example "1786010595695,019fd686-b761-740e-aa64-68543ed5d3f0".',
        }
      )
      .optional()
      .describe(
        'Pagination cursor: the "sort" value of the last (oldest) result from the previous page, comma-joined. Take it from the searchAfter field this action returns rather than building it by hand. Results are ordered newest first, so each page walks further back in time.'
      ),
  })
);
export type SearchScansInput = z.infer<typeof SearchScansInputSchema>;

/** getQuota takes no input; the empty schema exists so the action has a valid input contract. */
export const GetQuotaInputSchema = lazySchema(() => z.object({}));

// --- urlscan response shapes -------------------------------------------------------------
// Modelled from the vendor's Result API and Search API references plus live responses. Every
// member is optional: urlscan's own API best practices state that "certain JSON properties in
// API responses might occasionally be missing".

export interface SubmissionResponse {
  message?: string;
  uuid?: string;
  result?: string;
  api?: string;
  visibility?: string;
  url?: string;
  country?: string;
  options?: { useragent?: string };
}

export interface ScanTask {
  uuid?: string;
  time?: string;
  url?: string;
  visibility?: string;
  method?: string;
  source?: string;
  domain?: string;
  apexDomain?: string;
  tags?: string[];
  reportURL?: string;
  screenshotURL?: string;
  domURL?: string;
}

export interface ScanPage {
  url?: string;
  domain?: string;
  apexDomain?: string;
  country?: string;
  city?: string;
  server?: string;
  ip?: string;
  ptr?: string;
  asn?: string;
  asnname?: string;
  title?: string;
  status?: string;
  mimeType?: string;
  redirected?: string;
  umbrellaRank?: number;
  tlsIssuer?: string;
  tlsValidFrom?: string;
  tlsValidDays?: number;
  tlsAgeDays?: number;
  domainAgeDays?: number;
  apexDomainAgeDays?: number;
  language?: string;
}

/**
 * The Result API's `stats`. Note this is a DIFFERENT shape from the Search API's `stats`
 * (see SearchHitStats): a result carries the per-type breakdowns and the derived
 * percentages, but NOT the four scalar totals the search index exposes. Verified across 22
 * live results: `requests`, `uniqIPs`, `dataLength` and `encodedDataLength` are absent from
 * every one of them, so this connector derives those from the payload instead of reading
 * fields that never arrive.
 */
export interface ScanStats {
  uniqCountries?: number;
  malicious?: number;
  adBlocked?: number;
  secureRequests?: number;
  securePercentage?: number;
  IPv6Percentage?: number;
  totalLinks?: number;
  /** One entry per contacted IP; its length is the unique-IP count. */
  ipStats?: Array<{ ip?: string; countries?: string[]; requests?: number }>;
  /** Per-resource-type rollup. Its size/encodedSize members sum to the transfer totals. */
  resourceStats?: Array<{
    type?: string;
    count?: number;
    size?: number;
    encodedSize?: number;
    compression?: string;
    percentage?: number;
  }>;
}

/**
 * The Search API's `stats`, which is a much smaller object than the Result API's and is the
 * only place the four scalar totals actually appear.
 */
export interface SearchHitStats {
  uniqIPs?: number;
  uniqCountries?: number;
  requests?: number;
  dataLength?: number;
  encodedDataLength?: number;
}

export interface ScanBrand {
  key?: string;
  name?: string;
  country?: string[];
  vertical?: string[];
}

/**
 * The verdict block. `verdicts.overall` is the aggregate a triage rule should branch on;
 * `urlscan`, `engines`, and `community` are the individual sources behind it. Scores run
 * -100 (benign) to 100 (malicious).
 */
export interface ScanVerdictSource {
  score?: number;
  malicious?: boolean;
  hasVerdicts?: boolean;
  categories?: string[];
  brands?: Array<ScanBrand | string>;
  tags?: string[];
  votesTotal?: number;
  votesMalicious?: number;
  votesBenign?: number;
  detectionDetails?: string[];
  enginesTotal?: number;
  maliciousTotal?: number;
  benignTotal?: number;
}

export interface ScanVerdicts {
  overall?: ScanVerdictSource;
  urlscan?: ScanVerdictSource;
  engines?: ScanVerdictSource;
  community?: ScanVerdictSource;
}

export interface ScanRequestEntry {
  request?: {
    request?: { url?: string; method?: string };
    primaryRequest?: boolean;
  };
  response?: {
    response?: {
      status?: number;
      mimeType?: string;
      remoteIPAddress?: string;
      encodedDataLength?: number;
    };
    hash?: string;
    size?: number;
  };
}

export interface ScanResultResponse {
  task?: ScanTask;
  page?: ScanPage;
  stats?: ScanStats;
  verdicts?: ScanVerdicts;
  lists?: {
    ips?: string[];
    countries?: string[];
    asns?: string[];
    domains?: string[];
    urls?: string[];
    linkDomains?: string[];
    servers?: string[];
    hashes?: string[];
    certificates?: Array<{
      subjectName?: string;
      issuer?: string;
      validFrom?: number;
      validTo?: number;
    }>;
  };
  data?: {
    requests?: ScanRequestEntry[];
    cookies?: Array<{ name?: string; domain?: string }>;
    links?: Array<{ href?: string; text?: string }>;
    /** The redirect chain. A first-class phishing signal, so it is projected. */
    redirects?: Array<{ from?: string; to?: string; status?: number }>;
  };
  meta?: {
    processors?: {
      download?: { data?: Array<{ filename?: string; sha256?: string; mimeType?: string }> };
      wappa?: { data?: Array<{ app?: string; categories?: Array<{ name?: string }> }> };
      umbrella?: { data?: Array<{ hostname?: string; rank?: number }> };
    };
  };
  /** Where urlscan ran the scan from. Distinct from `submitter`, which is often empty. */
  scanner?: { country?: string };
  /** urlscan Pro only. */
  labels?: string[];
  usertags?: string[];
}

export interface SearchResultEntry {
  _id?: string;
  sort?: Array<number | string>;
  task?: ScanTask;
  page?: ScanPage;
  stats?: SearchHitStats;
  result?: string;
  screenshot?: string;
  brand?: ScanBrand[];
  verdicts?: { score?: number; malicious?: boolean };
}

export interface SearchResponse {
  results?: SearchResultEntry[];
  total?: number;
  took?: number;
  has_more?: boolean;
}

export interface QuotaWindow {
  limit?: number;
  used?: number;
  remaining?: number;
  percent?: number;
  reset?: string;
}

export interface QuotaResponse {
  scope?: string;
  limits?: Record<string, unknown>;
}
