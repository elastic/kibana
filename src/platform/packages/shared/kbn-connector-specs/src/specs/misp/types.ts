/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_SEARCH_LIMIT = 100;
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_ID_LENGTH = 200;
const MAX_IOC_VALUE_LENGTH = 2048;
// MISP stores attribute values in TEXT columns and tags in varchar(255).
const MAX_ATTRIBUTE_VALUE_LENGTH = 65_535;
const MAX_TAG_LENGTH = 255;
const MAX_INFO_LENGTH = 1024;
const MAX_DATE_LENGTH = 64;
const MAX_EVENT_ID_LENGTH = 36;
// Event ids are numeric (at most 10 digits) or UUIDs, per the MISP OpenAPI spec's EventId and UUID schemas.
const NUMERIC_EVENT_ID = /^\d{1,10}$/;
const EVENT_ID_OR_UUID =
  /^(\d{1,10}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Attribute types and categories MISP accepts, from its OpenAPI spec (AttributeType, AttributeCategory). */
export const MISP_ATTRIBUTE_TYPES = [
  'md5',
  'sha1',
  'sha256',
  'filename',
  'pdb',
  'filename|md5',
  'filename|sha1',
  'filename|sha256',
  'ip-src',
  'ip-dst',
  'hostname',
  'domain',
  'domain|ip',
  'email',
  'email-src',
  'eppn',
  'email-dst',
  'email-subject',
  'email-attachment',
  'email-body',
  'float',
  'git-commit-id',
  'url',
  'http-method',
  'user-agent',
  'ja3-fingerprint-md5',
  'jarm-fingerprint',
  'favicon-mmh3',
  'hassh-md5',
  'hasshserver-md5',
  'regkey',
  'regkey|value',
  'AS',
  'snort',
  'suricata',
  'bro',
  'zeek',
  'community-id',
  'pattern-in-file',
  'pattern-in-traffic',
  'pattern-in-memory',
  'pattern-filename',
  'pgp-public-key',
  'pgp-private-key',
  'yara',
  'stix2-pattern',
  'sigma',
  'gene',
  'kusto-query',
  'mime-type',
  'identity-card-number',
  'cookie',
  'vulnerability',
  'cpe',
  'weakness',
  'attachment',
  'malware-sample',
  'link',
  'comment',
  'text',
  'hex',
  'other',
  'named pipe',
  'mutex',
  'process-state',
  'target-user',
  'target-email',
  'target-machine',
  'target-org',
  'target-location',
  'target-external',
  'btc',
  'dash',
  'xmr',
  'iban',
  'bic',
  'bank-account-nr',
  'aba-rtn',
  'bin',
  'cc-number',
  'prtn',
  'phone-number',
  'threat-actor',
  'campaign-name',
  'campaign-id',
  'malware-type',
  'uri',
  'authentihash',
  'vhash',
  'ssdeep',
  'imphash',
  'telfhash',
  'pehash',
  'impfuzzy',
  'sha224',
  'sha384',
  'sha512',
  'sha512/224',
  'sha512/256',
  'sha3-224',
  'sha3-256',
  'sha3-384',
  'sha3-512',
  'tlsh',
  'cdhash',
  'filename|authentihash',
  'filename|vhash',
  'filename|ssdeep',
  'filename|imphash',
  'filename|impfuzzy',
  'filename|pehash',
  'filename|sha224',
  'filename|sha384',
  'filename|sha512',
  'filename|sha512/224',
  'filename|sha512/256',
  'filename|sha3-224',
  'filename|sha3-256',
  'filename|sha3-384',
  'filename|sha3-512',
  'filename|tlsh',
  'windows-scheduled-task',
  'windows-service-name',
  'windows-service-displayname',
  'whois-registrant-email',
  'whois-registrant-phone',
  'whois-registrant-name',
  'whois-registrant-org',
  'whois-registrar',
  'whois-creation-date',
  'x509-fingerprint-sha1',
  'x509-fingerprint-md5',
  'x509-fingerprint-sha256',
  'dns-soa-email',
  'size-in-bytes',
  'counter',
  'datetime',
  'port',
  'ip-dst|port',
  'ip-src|port',
  'hostname|port',
  'mac-address',
  'mac-eui-64',
  'email-dst-display-name',
  'email-src-display-name',
  'email-header',
  'email-reply-to',
  'email-x-mailer',
  'email-mime-boundary',
  'email-thread-index',
  'email-message-id',
  'github-username',
  'github-repository',
  'github-organisation',
  'jabber-id',
  'twitter-id',
  'dkim',
  'dkim-signature',
  'first-name',
  'middle-name',
  'last-name',
  'full-name',
  'date-of-birth',
  'place-of-birth',
  'gender',
  'passport-number',
  'passport-country',
  'passport-expiration',
  'redress-number',
  'nationality',
  'visa-number',
  'issue-date-of-the-visa',
  'primary-residence',
  'country-of-residence',
  'special-service-request',
  'frequent-flyer-number',
  'travel-details',
  'payment-details',
  'place-port-of-original-embarkation',
  'place-port-of-clearance',
  'place-port-of-onward-foreign-destination',
  'passenger-name-record-locator-number',
  'mobile-application-id',
  'chrome-extension-id',
  'edge-extension-id',
  'cortex',
  'boolean',
  'anonymised',
] as const;

export const MISP_ATTRIBUTE_CATEGORIES = [
  'Internal reference',
  'Targeting data',
  'Antivirus detection',
  'Payload delivery',
  'Artifacts dropped',
  'Payload installation',
  'Persistence mechanism',
  'Network activity',
  'Payload type',
  'Attribution',
  'External analysis',
  'Financial fraud',
  'Support Tool',
  'Social network',
  'Person',
  'Other',
] as const;

const eventIdSchema = (description: string) =>
  z
    .string()
    .max(MAX_EVENT_ID_LENGTH)
    .regex(EVENT_ID_OR_UUID, 'Use a numeric event id or an event UUID.')
    .describe(description);

export const SearchAttributesInputSchema = lazySchema(() =>
  z.object({
    value: z
      .string()
      .min(1)
      .max(MAX_IOC_VALUE_LENGTH)
      .optional()
      .describe('IOC value to search for.'),
    type: z
      .enum(MISP_ATTRIBUTE_TYPES)
      .optional()
      .describe('MISP attribute type filter (ip-dst, domain, md5, …).'),
    category: z
      .enum(MISP_ATTRIBUTE_CATEGORIES)
      .optional()
      .describe('MISP attribute category filter.'),
    tags: z
      .array(z.string().min(1).max(MAX_TAG_LENGTH))
      .max(50)
      .optional()
      .describe('Tag names to filter on.'),
    eventId: z
      .string()
      .max(10)
      .regex(NUMERIC_EVENT_ID, 'Use a numeric event id.')
      .optional()
      .describe('Restrict results to a single event, by its numeric id.'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_SEARCH_LIMIT)
      .default(DEFAULT_SEARCH_LIMIT)
      .describe(
        `Maximum number of attributes per page (1–${MAX_SEARCH_LIMIT}). Defaults to ${DEFAULT_SEARCH_LIMIT}.`
      ),
    page: z.coerce.number().int().min(1).default(1).describe('1-based page number. Defaults to 1.'),
  })
);
export type SearchAttributesInput = z.infer<typeof SearchAttributesInputSchema>;

export const SearchEventsInputSchema = lazySchema(() =>
  z.object({
    value: z
      .string()
      .min(1)
      .max(MAX_IOC_VALUE_LENGTH)
      .optional()
      .describe('IOC value that must appear in the event.'),
    tags: z
      .array(z.string().min(1).max(MAX_TAG_LENGTH))
      .max(50)
      .optional()
      .describe('Tag names to filter on.'),
    eventInfo: z
      .string()
      .min(1)
      .max(MAX_INFO_LENGTH)
      .optional()
      .describe('Substring match against event info/title.'),
    from: z
      .string()
      .min(1)
      .max(MAX_DATE_LENGTH)
      .optional()
      .describe('Published/date lower bound (YYYY-MM-DD or timestamp).'),
    to: z
      .string()
      .min(1)
      .max(MAX_DATE_LENGTH)
      .optional()
      .describe('Published/date upper bound (YYYY-MM-DD or timestamp).'),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_SEARCH_LIMIT)
      .default(DEFAULT_SEARCH_LIMIT)
      .describe(
        `Maximum number of events per page (1–${MAX_SEARCH_LIMIT}). Defaults to ${DEFAULT_SEARCH_LIMIT}.`
      ),
    page: z.coerce.number().int().min(1).default(1).describe('1-based page number. Defaults to 1.'),
  })
);
export type SearchEventsInput = z.infer<typeof SearchEventsInputSchema>;

export const CheckIndicatorInputSchema = lazySchema(() =>
  z.object({
    value: z.string().min(1).max(MAX_IOC_VALUE_LENGTH).describe('IOC value to look up.'),
    type: z
      .enum(MISP_ATTRIBUTE_TYPES)
      .optional()
      .describe('Optional MISP attribute type hint (ip-dst, domain, …).'),
  })
);
export type CheckIndicatorInput = z.infer<typeof CheckIndicatorInputSchema>;

export const AddSightingInputSchema = lazySchema(() =>
  z
    .object({
      attributeId: z
        .string()
        .min(1)
        .max(MAX_ID_LENGTH)
        .optional()
        .describe('Attribute id or UUID to attach the sighting to.'),
      value: z
        .string()
        .min(1)
        .max(MAX_IOC_VALUE_LENGTH)
        .optional()
        .describe('Attribute value when id/UUID is unknown.'),
      type: z.coerce
        .number()
        .int()
        .min(0)
        .max(2)
        .default(0)
        .describe('Sighting type: 0=sighting, 1=false-positive, 2=expiration.'),
      source: z.string().max(255).optional().describe('Optional sighting source label.'),
    })
    .refine((input) => Boolean(input.attributeId) || Boolean(input.value), {
      message: 'Provide attributeId or value.',
    })
);
export type AddSightingInput = z.infer<typeof AddSightingInputSchema>;

export const GetEventInputSchema = lazySchema(() =>
  z.object({
    eventId: eventIdSchema('Event id or UUID.'),
  })
);
export type GetEventInput = z.infer<typeof GetEventInputSchema>;

export const CheckWarninglistInputSchema = lazySchema(() =>
  z.object({
    values: z
      .array(z.string().min(1).max(MAX_IOC_VALUE_LENGTH))
      .min(1)
      .max(100)
      .describe('Indicator values to check against enabled warninglists.'),
  })
);
export type CheckWarninglistInput = z.infer<typeof CheckWarninglistInputSchema>;

export const CreateEventInputSchema = lazySchema(() =>
  z.object({
    info: z.string().min(1).max(MAX_INFO_LENGTH).describe('Event title / info (required).'),
    distribution: z.coerce
      .number()
      .int()
      .min(0)
      .max(3)
      .optional()
      .describe(
        'Distribution level: 0=your organisation only, 1=this community only, 2=connected communities, 3=all communities. Defaults to the MISP instance setting.'
      ),
    threatLevelId: z.coerce
      .number()
      .int()
      .min(1)
      .max(4)
      .optional()
      .describe('Threat level: 1=high, 2=medium, 3=low, 4=undefined.'),
    analysis: z.coerce
      .number()
      .int()
      .min(0)
      .max(2)
      .optional()
      .describe('Analysis state: 0=initial, 1=ongoing, 2=completed.'),
    published: z
      .boolean()
      .optional()
      .default(false)
      .describe('Whether to publish the event immediately. Defaults to false.'),
  })
);
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

export const AddAttributeInputSchema = lazySchema(() =>
  z.object({
    eventId: eventIdSchema('Event id or UUID to attach the attribute to.'),
    type: z.enum(MISP_ATTRIBUTE_TYPES).describe('MISP attribute type (ip-dst, domain, md5, …).'),
    value: z.string().min(1).max(MAX_ATTRIBUTE_VALUE_LENGTH).describe('Attribute value.'),
    category: z
      .enum(MISP_ATTRIBUTE_CATEGORIES)
      .optional()
      .describe(
        'MISP attribute category (e.g. "Network activity", "Payload delivery"). Defaults to the category MISP associates with the attribute type.'
      ),
    toIds: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'Whether the attribute is actionable for IDS / detection exports (MISP to_ids flag). Defaults to true.'
      ),
    comment: z
      .string()
      .max(1024)
      .optional()
      .describe('Optional free-text comment on the attribute.'),
  })
);
export type AddAttributeInput = z.infer<typeof AddAttributeInputSchema>;

export const PublishEventInputSchema = lazySchema(() =>
  z.object({
    eventId: eventIdSchema('Event id or UUID to publish.'),
  })
);
export type PublishEventInput = z.infer<typeof PublishEventInputSchema>;

export const AddTagToEventInputSchema = lazySchema(() =>
  z.object({
    eventId: eventIdSchema('Event id or UUID.'),
    tag: z.string().min(1).max(MAX_TAG_LENGTH).describe('Tag name or id to apply.'),
  })
);
export type AddTagToEventInput = z.infer<typeof AddTagToEventInputSchema>;
