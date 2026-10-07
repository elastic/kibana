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
import type { ConnectorSpec } from '../../connector_spec';
const SALESFORCE_API_VERSION = 'v66.0';

// Salesforce caps SOQL/SOSL statements at 100,000 characters and SOSL search
// strings at 10,000 characters; record Ids are 15 or 18 characters.
const SALESFORCE_MAX_SOQL_LENGTH = 100_000;
const SALESFORCE_MAX_SEARCH_TERM_LENGTH = 10_000;
const SALESFORCE_MAX_RETURNING_LENGTH = 2000;
const SALESFORCE_MAX_SOBJECT_NAME_LENGTH = 200;
const SALESFORCE_MAX_RECORD_ID_LENGTH = 18;
const SALESFORCE_MAX_URL_LENGTH = 2048;

/** Derive instance base URL from the full token URL (strip /services/oauth2/token and any path). */
function getBaseUrl(tokenUrl: string | undefined): string {
  if (!tokenUrl || tokenUrl.trim() === '') {
    throw new Error(
      'Salesforce connector is not configured: tokenUrl (OAuth token endpoint) is required.'
    );
  }
  const base = tokenUrl.includes('/services/oauth2/token')
    ? tokenUrl.replace(/\/services\/oauth2\/token.*$/, '')
    : tokenUrl;
  return base.replace(/\/+$/, '');
}

// nextRecordsUrl is appended to the instance URL and requested with the OAuth token, so it must stay a
// relative cursor path: a value such as `@attacker.example/x` would otherwise change the request host.
const NEXT_RECORDS_URL_REGEX = /^\/services\/data\/v\d+\.\d+\/(query|search)\/[A-Za-z0-9-]+$/;
const INVALID_NEXT_RECORDS_URL_MESSAGE =
  'nextRecordsUrl must be the relative path returned by a previous response, e.g. /services/data/v66.0/query/01gxx0000002-2000';

const NextRecordsUrlSchema = lazySchema(() =>
  z
    .string()
    .max(SALESFORCE_MAX_URL_LENGTH)
    .regex(NEXT_RECORDS_URL_REGEX, { message: INVALID_NEXT_RECORDS_URL_MESSAGE })
    .optional()
    .describe('Pagination URL from previous response')
);

/** Resolve Salesforce nextRecordsUrl (relative path) to a full URL. */
function createPaginationUrl(baseUrl: string, nextRecordsUrl: string): string {
  if (!NEXT_RECORDS_URL_REGEX.test(nextRecordsUrl)) {
    throw new Error(INVALID_NEXT_RECORDS_URL_MESSAGE);
  }
  return `${baseUrl}${nextRecordsUrl}`;
}

/** Salesforce object API names: letters, numbers, underscore only. Throws if invalid (SOQL injection safety). */
const SOBJECT_NAME_REGEX = /^[A-Za-z0-9_]+$/;
function validateSobjectName(name: string): void {
  if (!name || !SOBJECT_NAME_REGEX.test(name.trim())) {
    throw new Error(
      `Invalid sobject name: must contain only letters, numbers, and underscore (e.g. Account, MyObject__c). Got: ${
        name?.substring(0, 50) ?? ''
      }`
    );
  }
}

export const SalesforceConnector: ConnectorSpec = {
  metadata: {
    id: '.salesforce',
    displayName: 'Salesforce',
    description: i18n.translate('core.kibanaConnectorSpecs.salesforce.metadata.description', {
      defaultMessage: 'Query records, search, describe objects, and download files in Salesforce',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder', 'contextEngine'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        isRecommended: true,
        defaults: {
          scope: 'api refresh_token',
        },
        overrides: {
          meta: {
            authorizationUrl: {
              placeholder: 'https://login.salesforce.com/services/oauth2/authorize',
            },
            tokenUrl: {
              placeholder: 'https://login.salesforce.com/services/oauth2/token',
            },
            scope: { hidden: true },
          },
        },
      },
      {
        type: 'oauth_client_credentials',
        defaults: {},
        overrides: {
          meta: {
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  actions: {
    query: {
      isTool: true,
      scope: 'read',
      description:
        'Run a SOQL query and return matching records with the selected fields. Use this for structured filtering (WHERE), field selection, sorting, or relationship queries; prefer get_record when you already have an Id and search for free-text discovery. Returns records, totalSize, done, and nextRecordsUrl when more pages exist.',
      input: lazySchema(() =>
        z.object({
          soql: z
            .string()
            .max(SALESFORCE_MAX_SOQL_LENGTH)
            .describe(
              'SOQL query. Prefer LIMIT 10-20 and WHERE to narrow results; use nextRecordsUrl from response for more.'
            ),
          nextRecordsUrl: NextRecordsUrlSchema,
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as { soql: string; nextRecordsUrl?: string };
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        if (typedInput.nextRecordsUrl) {
          const url = createPaginationUrl(baseUrl, typedInput.nextRecordsUrl);
          const response = await ctx.client.get(url, {});
          return response.data;
        }
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/query`,
          { params: { q: typedInput.soql } }
        );
        return response.data;
      },
    },

    get_record: {
      isTool: true,
      scope: 'read',
      description:
        'Fetch a single Salesforce record by SObject name and record Id, returning all of its fields. Use this when you already have an Id from query, list_records, or search; use query instead when you need filtering or only specific fields.',
      input: lazySchema(() =>
        z.object({
          sobjectName: z
            .string()
            .max(SALESFORCE_MAX_SOBJECT_NAME_LENGTH)
            .describe(
              'SObject API name (standard or custom, e.g. Account, Contact, MyObject__c). Must match the object that owns the record.'
            ),
          recordId: z
            .string()
            .max(SALESFORCE_MAX_RECORD_ID_LENGTH)
            .describe(
              'Record Id (15- or 18-char). Get from query, list_records, or search results.'
            ),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as { sobjectName: string; recordId: string };
        validateSobjectName(typedInput.sobjectName);
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const sobjectSegment = encodeURIComponent(typedInput.sobjectName.trim());
        const recordIdSegment = encodeURIComponent(typedInput.recordId);
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/${sobjectSegment}/${recordIdSegment}`,
          {}
        );
        return response.data;
      },
    },

    list_records: {
      isTool: true,
      scope: 'read',
      description:
        'List record Ids for a single SObject type without filtering. Use this for a quick sample of Ids, then follow up with get_record or query for field details; use query when you need WHERE clauses or specific fields. Returns records containing only Id, plus nextRecordsUrl when more pages exist.',
      input: lazySchema(() =>
        z.object({
          sobjectName: z
            .string()
            .max(SALESFORCE_MAX_SOBJECT_NAME_LENGTH)
            .describe('SObject API name (e.g. Account, Contact, MyObject__c)'),
          limit: z
            .number()
            .default(10)
            .describe('Max records to return (1-2000). Prefer 10-20 to keep context small.'),
          nextRecordsUrl: NextRecordsUrlSchema,
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          sobjectName: string;
          limit: number;
          nextRecordsUrl?: string;
        };
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        if (typedInput.nextRecordsUrl) {
          const url = createPaginationUrl(baseUrl, typedInput.nextRecordsUrl);
          const response = await ctx.client.get(url, {});
          return response.data;
        }
        validateSobjectName(typedInput.sobjectName);
        const limit = Math.min(typedInput.limit ?? 10, 2000);
        const soql = `SELECT Id FROM ${typedInput.sobjectName.trim()} LIMIT ${limit}`;
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/query`,
          { params: { q: soql } }
        );
        return response.data;
      },
    },

    search: {
      isTool: true,
      scope: 'read',
      description:
        'Run a SOSL full-text search for a phrase across the SObject types listed in returning. Use this for broad text discovery when you do not know which records match; prefer query (SOQL) for structured filtering on known fields. Returns matching records grouped in searchRecords.',
      input: lazySchema(() =>
        z.object({
          searchTerm: z
            .string()
            .max(SALESFORCE_MAX_SEARCH_TERM_LENGTH)
            .describe(
              'Search phrase for SOSL full-text search (e.g. "Acme Corp" or "Q4 renewal"). Only searches objects listed in returning; not all text fields are indexed; results capped at ~2000. Prefer query (SOQL) for structured filtering; use search for broad text discovery.'
            ),
          returning: z
            .string()
            .max(SALESFORCE_MAX_RETURNING_LENGTH)
            .describe(
              'Object API names to search, comma-separated (e.g. Account,Contact). Prefer 1-3 types to keep result size down. Custom objects require "Allow Search" enabled. Use describe to discover object names.'
            ),
          nextRecordsUrl: NextRecordsUrlSchema,
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as {
          searchTerm: string;
          returning: string;
          nextRecordsUrl?: string;
        };
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string);
        if (typedInput.nextRecordsUrl) {
          const url = createPaginationUrl(baseUrl, typedInput.nextRecordsUrl);
          const response = await ctx.client.get(url, {});
          return response.data;
        }
        const soslQuery = `FIND {${
          typedInput.searchTerm
        }} RETURNING ${typedInput.returning.trim()}`;
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/search`,
          { params: { q: soslQuery } }
        );
        return response.data;
      },
    },

    describe: {
      isTool: true,
      scope: 'read',
      description:
        'Describe an SObject type, returning its fields (names, types, picklist values) and relationships to other objects. Call this before writing a query or search against an unfamiliar object so you use valid field and object names.',
      input: lazySchema(() =>
        z.object({
          sobjectName: z
            .string()
            .max(SALESFORCE_MAX_SOBJECT_NAME_LENGTH)
            .describe(
              'SObject API name. Use before query or search to discover field names, relationships, and picklist values. Common standard objects you can describe without prior discovery: Account (companies/orgs), Contact (people linked to Account), Opportunity (sales deals with stage/amount/close date), Case (support tickets), Lead (unqualified prospects), Task (action items/follow-ups), ContentVersion (file/attachment versions; use with ContentDocumentLink for downloads). Custom objects always end with __c (e.g. MyObject__c).'
            ),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as { sobjectName: string };
        validateSobjectName(typedInput.sobjectName);
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const sobjectSegment = encodeURIComponent(typedInput.sobjectName.trim());
        const response = await ctx.client.get(
          `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/${sobjectSegment}/describe`,
          {}
        );
        return response.data;
      },
    },

    download_file: {
      isTool: true,
      scope: 'read',
      description:
        'Download a file from Salesforce by its ContentVersion Id. Returns the file as base64-encoded data with its content type. WARNING: Returns potentially large base64 payloads. Only call this when you have a plan to process the binary data (e.g. via an Elasticsearch ingest pipeline attachment processor). Use SOQL on ContentDocumentLink and ContentVersion to discover file Ids first.',
      input: lazySchema(() =>
        z.object({
          contentVersionId: z
            .string()
            .max(SALESFORCE_MAX_RECORD_ID_LENGTH)
            .describe(
              'ContentVersion record Id (15 or 18 chars). Get from SOQL on ContentVersion or ContentDocumentLink. Returns base64-encoded file content and content-type.'
            ),
        })
      ),
      handler: async (ctx, input) => {
        const typedInput = input as { contentVersionId: string };
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const id = encodeURIComponent(typedInput.contentVersionId.trim());
        const url = `${baseUrl}/services/data/${SALESFORCE_API_VERSION}/sobjects/ContentVersion/${id}/VersionData`;
        const response = await ctx.client.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data as ArrayBuffer);
        return {
          base64: buffer.toString('base64'),
          contentType: (response.headers as { 'content-type'?: string })?.['content-type'],
        };
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.salesforce.test.description', {
      defaultMessage: 'Verifies Salesforce connection by running a simple query',
    }),
    handler: async (ctx) => {
      ctx.log.debug('Salesforce test handler');
      const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
      await ctx.client.get(`${baseUrl}/services/data/${SALESFORCE_API_VERSION}/query`, {
        params: { q: 'SELECT Id FROM User LIMIT 1' },
      });
      return {};
    },
    enabled: true,
  },

  skill: [
    '## Salesforce connector — LLM usage guide',
    '',
    '### Discovery: always describe before querying',
    'Before writing a SOQL query or SOSL search against an unfamiliar object, call `describe` with the SObject API name.',
    '`describe` returns every field name, its type, relationships to other objects, and picklist values.',
    '',
    '### Choosing between get_record, list_records, and query',
    '- `get_record`: use when you already have a record Id and want all fields for that single record.',
    '- `list_records`: use when you need a quick list of Ids for a known object type with no filtering.',
    '  Returns only `Id` by default; follow up with `get_record` or `query` for field details.',
    '- `query`: use when you need filtering (`WHERE`), specific field selection, sorting, or joins across objects.',
    '  This is the most flexible option and should be preferred when more than just Ids are needed.',
    '',
    '### File downloads',
    'Salesforce stores files as `ContentVersion` records linked to any object via `ContentDocumentLink`.',
    'Workflow to download a file:',
    '1. Query `ContentDocumentLink` to find file links for a record:',
    "   `SELECT ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId = '<recordId>'`",
    '2. Query `ContentVersion` to get the version Id:',
    "   `SELECT Id, Title, FileType FROM ContentVersion WHERE ContentDocumentId = '<docId>' AND IsLatest = true LIMIT 1`",
    '3. Call `download_file` with the `ContentVersion` Id.',
    '   The response includes `base64`-encoded file content and `contentType`.',
    '   WARNING: download_file returns potentially large base64 payloads. Only call it when you',
    '   have a plan to process the binary data (e.g. via an Elasticsearch ingest pipeline',
    '   attachment processor to extract text).',
  ].join('\n'),
};
