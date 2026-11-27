/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

/** SentinelOne ids: letters, digits, '-' and '_', never ',' (lists are sent comma-separated). */
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
/** Severity filter values such as CRITICAL (the other Application Risk filters take the values SentinelOne lists, such as Official Fix). */
const UPPER_VALUE_PATTERN = /^[A-Z][A-Z_]*$/;
/** Any value that does not break the comma-separated list encoding. */
const NO_COMMA_PATTERN = /^[^,]+$/;
const ISO_DATE_HINT = 'ISO 8601, for example 2026-01-31T00:00:00Z';

const idString = (maxLength: number) => z.string().min(1).max(maxLength).regex(ID_PATTERN);
const upperValues = (maxItems: number, description: string) =>
  z
    .array(z.string().min(1).max(64).regex(UPPER_VALUE_PATTERN))
    .max(maxItems)
    .optional()
    .describe(description);
const isoDate = (description: string) =>
  z.string().min(1).max(40).optional().describe(`${description}, ${ISO_DATE_HINT}`);

export const APPLICATION_CVE_SORT_FIELDS = [
  'cveId',
  'severity',
  'nvdBaseScore',
  'publishedDate',
  'riskScore',
  'exploitedInTheWild',
] as const;

// getApplicationCves: GET /web/api/v2.1/application-management/risks/cves
export const GetApplicationCvesInputSchema = lazySchema(() =>
  z
    .object({
      applicationIds: z
        .array(idString(32))
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Application Risk inventory id; send one (several need Ranger Insights). Use this or applicationName + applicationVendor'
        ),
      applicationName: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe('Application name, for example handlebars; requires applicationVendor'),
      applicationVendor: z
        .string()
        .min(1)
        .max(512)
        .optional()
        .describe(
          'Application vendor exactly as stored, HTML-escaped, for example "Ubuntu Developers &lt;a@b&gt;"; requires applicationName'
        ),
      applicationVersions: z
        .array(z.string().min(1).max(255).regex(NO_COMMA_PATTERN))
        .min(1)
        .max(100)
        .optional()
        .describe(
          'Application versions, for example 3:4.7.7+~4.1.0-1; with applicationName + applicationVendor, required without Ranger Insights'
        ),
      cveIdContains: z
        .array(z.string().min(1).max(32).regex(ID_PATTERN))
        .max(100)
        .optional()
        .describe('CVE id contains, for example CVE-2021-23383 or 2021-23'),
      severities: upperValues(10, 'Severities, for example CRITICAL, HIGH, MEDIUM, LOW'),
      remediationLevels: z
        .array(
          z.enum(['Official Fix', 'Temporary Fix', 'Workaround', 'Unavailable', 'Not Defined'])
        )
        .max(5)
        .optional()
        .describe('Remediation levels (needs Ranger Insights)'),
      exploitedInTheWild: z
        .array(z.enum(['Yes', 'Unknown', 'Not Defined']))
        .max(3)
        .optional()
        .describe('Exploited in the wild (needs Ranger Insights)'),
      exploitCodeMaturity: z
        .array(z.enum(['Functional', 'High', 'Proof of Concept', 'Unproven', 'Not Defined']))
        .max(5)
        .optional()
        .describe('Exploit code maturity (needs Ranger Insights)'),
      reportConfidence: z
        .array(z.enum(['Confirmed', 'Reasonable', 'Unknown', 'Not Defined']))
        .max(4)
        .optional()
        .describe('Report confidence (needs Ranger Insights)'),
      analystVerdict: z
        .array(z.enum(['Default', 'False Positive', 'Added CVE']))
        .max(3)
        .optional()
        .describe('Analyst verdicts: Default (not edited), False Positive or Added CVE'),
      publishedDateGte: isoDate('Published at or after'),
      publishedDateLte: isoDate('Published at or before'),
      publishedDateGt: isoDate('Published after'),
      publishedDateLt: isoDate('Published before'),
      publishedDateBetween: z
        .string()
        .max(40)
        .regex(/^\d{10,16}-\d{10,16}$/)
        .optional()
        .describe(
          'Published between, epoch milliseconds <from>-<to>, for example 1609459200000-1640995200000'
        ),
      accountIds: z.array(idString(32)).max(500).optional().describe('Account ids'),
      siteIds: z.array(idString(32)).max(500).optional().describe('Site ids'),
      groupIds: z.array(idString(32)).max(500).optional().describe('Group ids'),
      sortBy: z.enum(APPLICATION_CVE_SORT_FIELDS).optional().describe('Sort field'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      limit: z.number().int().min(1).max(1000).optional().describe('Page size (default 10)'),
      cursor: z
        .string()
        .max(2048)
        .optional()
        .describe('nextCursor of the previous page (same filters)'),
      skip: z
        .number()
        .int()
        .min(0)
        .max(1000)
        .optional()
        .describe('Items to skip; use cursor to go further'),
      countOnly: z
        .boolean()
        .optional()
        .describe('Return only pagination.totalItems, with an empty data list'),
      skipCount: z.boolean().optional().describe('Skip computing pagination.totalItems (faster)'),
    })
    .superRefine((value, ctx) => {
      const byIds = value.applicationIds !== undefined;
      const byName = value.applicationName !== undefined || value.applicationVendor !== undefined;
      if (byIds && byName) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Use either applicationIds or applicationName + applicationVendor to target the application, not both',
          path: ['applicationIds'],
        });
      } else if (!byIds && !byName) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Target one application: applicationIds, or applicationName + applicationVendor (+ applicationVersions)',
          path: ['applicationIds'],
        });
      } else if (byName && (!value.applicationName || !value.applicationVendor)) {
        ctx.addIssue({
          code: 'custom',
          message: 'applicationName and applicationVendor must be given together',
          path: [value.applicationName ? 'applicationVendor' : 'applicationName'],
        });
      }
      if (byIds && value.applicationVersions !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'applicationVersions applies only with applicationName + applicationVendor',
          path: ['applicationVersions'],
        });
      }
    })
);
export type GetApplicationCvesInput = z.infer<typeof GetApplicationCvesInputSchema>;
