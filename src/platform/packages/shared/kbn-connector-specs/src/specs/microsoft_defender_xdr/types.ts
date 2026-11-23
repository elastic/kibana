/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_ID_LENGTH = 200;
const MAX_FILTER_LENGTH = 1000;
const MAX_QUERY_LENGTH = 10_000;
const MAX_TIMESPAN_LENGTH = 50;
const MAX_ASSIGNEE_LENGTH = 500;
const MAX_COMMENT_LENGTH = 5000;
const MAX_TAG_LENGTH = 200;
const MAX_TOP = 100;
const DEFAULT_TOP = 25;

// ---- Cloud config ----

export const cloudValues = ['commercial', 'gcchigh', 'dod'] as const;
export type Cloud = (typeof cloudValues)[number];

/** Map cloud environment to its Graph API base URL. */
export const GRAPH_HOST: Record<Cloud, string> = {
  commercial: 'https://graph.microsoft.com',
  gcchigh: 'https://graph.microsoft.us',
  dod: 'https://dod-graph.microsoft.us',
};

export const CloudConfigSchema = lazySchema(() =>
  z.object({
    cloud: z
      .enum(cloudValues)
      .default('commercial')
      .describe(
        'Microsoft cloud environment. Use "commercial" for the global public cloud, "gcchigh" for US Government GCC High, or "dod" for US Government DoD. ' +
          'This determines the Microsoft Graph API endpoint used for all requests.'
      )
      .meta({
        label: 'Cloud environment',
        widget: 'select',
        options: [
          { value: 'commercial', label: 'Commercial (global)' },
          { value: 'gcchigh', label: 'US Government GCC High' },
          { value: 'dod', label: 'US Government DoD' },
        ],
      }),
  })
);
export type CloudConfig = z.infer<typeof CloudConfigSchema>;

// ---- Detection rules ----

const MAX_RULE_NAME_LENGTH = 200;
const MAX_RULE_QUERY_LENGTH = 10_000;
const MAX_RULE_DESCRIPTION_LENGTH = 2000;

const detectionRuleSchedulePeriodValues = ['PT1H', 'PT3H', 'PT12H', 'P1D', 'P7D'] as const;
const detectionRuleSeverityValues = ['unknown', 'informational', 'low', 'medium', 'high'] as const;

export const ListDetectionRulesInputSchema = lazySchema(() =>
  z.object({
    top: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_TOP)
      .default(DEFAULT_TOP)
      .describe(`Maximum number of rules to return (1–${MAX_TOP}). Defaults to ${DEFAULT_TOP}.`),
    skip: z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .describe('Number of rules to skip for pagination. Defaults to 0.'),
  })
);
export type ListDetectionRulesInput = z.infer<typeof ListDetectionRulesInputSchema>;

export const GetDetectionRuleInputSchema = lazySchema(() =>
  z.object({
    ruleId: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .describe('The numeric ID of the custom detection rule.'),
  })
);
export type GetDetectionRuleInput = z.infer<typeof GetDetectionRuleInputSchema>;

const AlertTemplateSchema = lazySchema(() =>
  z.object({
    title: z
      .string()
      .min(1)
      .max(MAX_RULE_NAME_LENGTH)
      .describe('Title of the alert generated when the rule triggers.'),
    description: z
      .string()
      .max(MAX_RULE_DESCRIPTION_LENGTH)
      .optional()
      .describe('Description of the alert.'),
    severity: z.enum(detectionRuleSeverityValues).describe('Severity of the generated alert.'),
    recommendedActions: z
      .string()
      .max(MAX_RULE_DESCRIPTION_LENGTH)
      .optional()
      .describe('Analyst recommendations when this alert fires.'),
    tactics: z
      .array(z.string().min(1).max(20))
      .max(20)
      .optional()
      .describe('List of MITRE ATT&CK technique IDs, e.g. ["T1059", "T1055"].'),
  })
);

export const CreateDetectionRuleInputSchema = lazySchema(() =>
  z.object({
    displayName: z
      .string()
      .min(1)
      .max(MAX_RULE_NAME_LENGTH)
      .describe('Unique display name for the custom detection rule.'),
    status: z
      .enum(['enabled', 'disabled'])
      .default('enabled')
      .describe(
          "Whether the rule runs on its schedule: 'enabled' or 'disabled'. Defaults to 'enabled' when omitted, so pass 'disabled' explicitly to stage an inactive rule."
        ),
    queryText: z
      .string()
      .min(1)
      .max(MAX_RULE_QUERY_LENGTH)
      .describe(
        'KQL query to run. Must project at least one of: DeviceId, AccountObjectId, AccountSid, AccountUpn, AccountName, MailboxAddress, FileName, SHA256, IPAddress, URL.'
      ),
    period: z
      .enum(detectionRuleSchedulePeriodValues)
      .describe(
        'How often the rule runs: PT1H (1 h), PT3H (3 h), PT12H (12 h), P1D (1 day), P7D (7 days).'
      ),
    alertTemplate: AlertTemplateSchema.describe(
      'Alert definition generated when the rule triggers. Includes title, severity, description, category, recommended actions, and MITRE technique IDs.'
    ),
  })
);
export type CreateDetectionRuleInput = z.infer<typeof CreateDetectionRuleInputSchema>;

export const UpdateDetectionRuleInputSchema = lazySchema(() =>
  z
    .object({
      ruleId: z
        .string()
        .min(1)
        .max(MAX_ID_LENGTH)
        .describe('The numeric ID of the custom detection rule to update.'),
      displayName: z
        .string()
        .min(1)
        .max(MAX_RULE_NAME_LENGTH)
        .optional()
        .describe('New display name for the rule.'),
      status: z
        .enum(['enabled', 'disabled'])
        .optional()
        .describe("Enable or disable the rule: 'enabled' or 'disabled'."),
      queryText: z
        .string()
        .min(1)
        .max(MAX_RULE_QUERY_LENGTH)
        .optional()
        .describe('Updated KQL query text.'),
      period: z.enum(detectionRuleSchedulePeriodValues).optional().describe('New schedule period.'),
      alertTemplate: AlertTemplateSchema.optional().describe(
        'Updated alert definition. Includes title, severity, description, category, recommended actions, and MITRE technique IDs.'
      ),
    })
    .refine(
      (input) =>
        input.displayName !== undefined ||
        input.status !== undefined ||
        input.queryText !== undefined ||
        input.period !== undefined ||
        input.alertTemplate !== undefined,
      { message: 'At least one field to update must be provided.' }
    )
);
export type UpdateDetectionRuleInput = z.infer<typeof UpdateDetectionRuleInputSchema>;

export const DeleteDetectionRuleInputSchema = lazySchema(() =>
  z.object({
    ruleId: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .describe('The numeric ID of the custom detection rule to delete.'),
  })
);
export type DeleteDetectionRuleInput = z.infer<typeof DeleteDetectionRuleInputSchema>;

// ---- Shared enums ----

const incidentStatusValues = ['active', 'resolved', 'inProgress', 'redirected'] as const;
const incidentClassificationValues = [
  'unknown',
  'falsePositive',
  'truePositive',
  'informationalExpectedActivity',
] as const;
const incidentDeterminationValues = [
  'unknown',
  'apt',
  'malware',
  'securityPersonnel',
  'securityTesting',
  'unwantedSoftware',
  'multiStagedAttack',
  'compromisedAccount',
  'maliciousUserActivity',
  'phishing',
  'notMalicious',
  'confirmedActivity',
  'lineOfBusinessApplication',
  'other',
  'notEnoughDataToValidate',
] as const;
const severityValues = ['unknown', 'informational', 'low', 'medium', 'high'] as const;

const alertStatusValues = ['new', 'inProgress', 'resolved'] as const;
const alertDeterminationValues = [
  'unknown',
  'apt',
  'malware',
  'securityPersonnel',
  'securityTesting',
  'unwantedSoftware',
  'multiStagedAttack',
  'compromisedAccount',
  'maliciousUserActivity',
  'phishing',
  'notMalicious',
  'confirmedActivity',
  'lineOfBusinessApplication',
  'other',
  'notEnoughDataToValidate',
] as const;

// ---- Incidents ----

export const ListIncidentsInputSchema = lazySchema(() =>
  z.object({
    filter: z
      .string()
      .max(MAX_FILTER_LENGTH)
      .optional()
      .describe(
        "OData $filter expression, e.g. \"status eq 'active' and severity eq 'high'\". " +
          'Supports eq, ne, and, or, in operators on most incident fields.'
      ),
    top: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_TOP)
      .default(DEFAULT_TOP)
      .describe(
        `Maximum number of incidents to return (1–${MAX_TOP}). Defaults to ${DEFAULT_TOP}.`
      ),
    skip: z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .describe('Number of incidents to skip for pagination. Defaults to 0.'),
    includeAlerts: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'When true, expands each incident to include its related alerts. Defaults to false.'
      ),
  })
);
export type ListIncidentsInput = z.infer<typeof ListIncidentsInputSchema>;

export const GetIncidentInputSchema = lazySchema(() =>
  z.object({
    incidentId: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .describe('Numeric incident ID, e.g. "29". Include alerts automatically.'),
  })
);
export type GetIncidentInput = z.infer<typeof GetIncidentInputSchema>;

export const UpdateIncidentInputSchema = lazySchema(() =>
  z
    .object({
      incidentId: z.string().min(1).max(MAX_ID_LENGTH).describe('Numeric incident ID to update.'),
      status: z
        .enum(incidentStatusValues)
        .optional()
        .describe('New status: active, resolved, inProgress, or redirected.'),
      assignedTo: z
        .string()
        .max(MAX_ASSIGNEE_LENGTH)
        .optional()
        .describe('UPN or email of the analyst to assign the incident to.'),
      classification: z
        .enum(incidentClassificationValues)
        .optional()
        .describe(
          'Incident classification: unknown, falsePositive, truePositive, or informationalExpectedActivity.'
        ),
      determination: z
        .enum(incidentDeterminationValues)
        .optional()
        .describe('Incident determination (requires classification to be set).'),
      severity: z
        .enum(severityValues)
        .optional()
        .describe('Incident severity: unknown, informational, low, medium, or high.'),
      customTags: z
        .array(z.string().min(1).max(MAX_TAG_LENGTH))
        .max(50)
        .optional()
        .describe('Full replacement list of custom tags to apply to the incident.'),
    })
    .refine(
      (input) =>
        input.status !== undefined ||
        input.assignedTo !== undefined ||
        input.classification !== undefined ||
        input.determination !== undefined ||
        input.severity !== undefined ||
        input.customTags !== undefined,
      { message: 'At least one field to update must be provided.' }
    )
);
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentInputSchema>;

export const AddIncidentCommentInputSchema = lazySchema(() =>
  z.object({
    incidentId: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .describe('Numeric incident ID to add the comment to.'),
    comment: z
      .string()
      .min(1)
      .max(MAX_COMMENT_LENGTH)
      .describe('Comment text to append to the incident activity log.'),
  })
);
export type AddIncidentCommentInput = z.infer<typeof AddIncidentCommentInputSchema>;

// ---- Alerts ----

export const ListAlertsInputSchema = lazySchema(() =>
  z.object({
    filter: z
      .string()
      .max(MAX_FILTER_LENGTH)
      .optional()
      .describe(
        "OData $filter expression, e.g. \"severity eq 'high' and status eq 'new'\". " +
          'Supports eq, ne, and, or on most alert fields.'
      ),
    top: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_TOP)
      .default(DEFAULT_TOP)
      .describe(`Maximum number of alerts to return (1–${MAX_TOP}). Defaults to ${DEFAULT_TOP}.`),
    skip: z.coerce
      .number()
      .int()
      .min(0)
      .default(0)
      .describe('Number of alerts to skip for pagination. Defaults to 0.'),
  })
);
export type ListAlertsInput = z.infer<typeof ListAlertsInputSchema>;

export const GetAlertInputSchema = lazySchema(() =>
  z.object({
    alertId: z.string().min(1).max(MAX_ID_LENGTH).describe('Defender alert ID.'),
  })
);
export type GetAlertInput = z.infer<typeof GetAlertInputSchema>;

export const UpdateAlertInputSchema = lazySchema(() =>
  z
    .object({
      alertId: z.string().min(1).max(MAX_ID_LENGTH).describe('Defender alert ID to update.'),
      status: z
        .enum(alertStatusValues)
        .optional()
        .describe('New alert status: new, inProgress, or resolved.'),
      assignedTo: z
        .string()
        .max(MAX_ASSIGNEE_LENGTH)
        .optional()
        .describe('UPN or email of the analyst to assign the alert to.'),
      classification: z
        .enum(incidentClassificationValues)
        .optional()
        .describe(
          'Alert classification: unknown, falsePositive, truePositive, or informationalExpectedActivity.'
        ),
      determination: z
        .enum(alertDeterminationValues)
        .optional()
        .describe('Alert determination (requires classification to be set).'),
    })
    .refine(
      (input) =>
        input.status !== undefined ||
        input.assignedTo !== undefined ||
        input.classification !== undefined ||
        input.determination !== undefined,
      { message: 'At least one field to update must be provided.' }
    )
);
export type UpdateAlertInput = z.infer<typeof UpdateAlertInputSchema>;

// ---- Advanced Hunting ----

export const RunHuntingQueryInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(MAX_QUERY_LENGTH)
      .describe(
        'Kusto Query Language (KQL) query to run against Microsoft Defender XDR advanced hunting tables ' +
          '(e.g. DeviceEvents, EmailEvents, AlertInfo, AlertEvidence). ' +
          'Results are limited to 100,000 rows and 30 days of data.'
      ),
    timespan: z
      .string()
      .max(MAX_TIMESPAN_LENGTH)
      .optional()
      .describe(
        'Optional ISO 8601 duration to scope the query time range, e.g. "PT1H" (1 hour), "P7D" (7 days). ' +
          'When omitted the query uses its own time filters or defaults to the past 30 days.'
      ),
  })
);
export type RunHuntingQueryInput = z.infer<typeof RunHuntingQueryInputSchema>;

// ---- Alert comments ----

export const AddAlertCommentInputSchema = lazySchema(() =>
  z.object({
    alertId: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .describe('Defender alert ID to add the comment to.'),
    comment: z
      .string()
      .min(1)
      .max(MAX_COMMENT_LENGTH)
      .describe('Comment text to append to the alert activity log.'),
  })
);
export type AddAlertCommentInput = z.infer<typeof AddAlertCommentInputSchema>;

// ---- Merge incidents ----

export const correlationReasonValues = [
  'repeatedAlertOccurrence',
  'sameGeography',
  'similarArtifacts',
  'sameTargetedAsset',
  'sameNetworkSegment',
  'eventSequence',
  'timeFrame',
  'sameThreatSource',
] as const;
export type CorrelationReason = (typeof correlationReasonValues)[number];

export const MergeIncidentsInputSchema = lazySchema(() =>
  z.object({
    incidentIds: z
      .array(z.string().min(1).max(MAX_ID_LENGTH))
      .min(2)
      .max(100)
      .describe(
        'List of at least two incident IDs to merge. The first ID becomes the primary (surviving) incident; the remaining incidents are merged into it.'
      ),
    comment: z
      .string()
      .min(1)
      .max(MAX_COMMENT_LENGTH)
      .describe(
        'Required comment explaining why the incidents are being merged. The Graph API enforces this field regardless of its optional annotation.'
      ),
    mergeReasons: z
      .array(z.enum(correlationReasonValues))
      .min(1)
      .max(correlationReasonValues.length)
      .optional()
      .describe(
        'Optional list of correlation reasons that explain the relationship between the merged incidents. ' +
          'Valid values: repeatedAlertOccurrence, sameGeography, similarArtifacts, sameTargetedAsset, ' +
          'sameNetworkSegment, eventSequence, timeFrame, sameThreatSource.'
      ),
  })
);
export type MergeIncidentsInput = z.infer<typeof MergeIncidentsInputSchema>;

// ---- Threat Intelligence ----

const MAX_HOST_LENGTH = 253; // RFC 1035 max FQDN length; also covers IPv6 addresses (max 45 chars)

export const GetThreatIntelHostInputSchema = lazySchema(() =>
  z.object({
    host: z
      .string()
      .min(1)
      .max(MAX_HOST_LENGTH)
      .describe(
        'Hostname (FQDN), IP address, or IP:port to look up in Microsoft Defender Threat Intelligence. ' +
          'Examples: "contoso.com", "192.0.2.1", "2001:db8::1".'
      ),
  })
);
export type GetThreatIntelHostInput = z.infer<typeof GetThreatIntelHostInputSchema>;

export const GetWhoisRecordInputSchema = lazySchema(() =>
  z.object({
    host: z
      .string()
      .min(1)
      .max(MAX_HOST_LENGTH)
      .describe(
        'Domain name to retrieve WHOIS registration data for, e.g. "contoso.com". ' +
          'Subdomains are accepted; the lookup resolves to the registrable domain.'
      ),
  })
);
export type GetWhoisRecordInput = z.infer<typeof GetWhoisRecordInputSchema>;

// ---- Secure Score ----

export const ListSecureScoresInputSchema = lazySchema(() =>
  z.object({
    top: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_TOP)
      .default(DEFAULT_TOP)
      .describe(
        `Maximum number of Secure Score snapshots to return (1–${MAX_TOP}), ordered by date descending so the most recent score is first. Defaults to ${DEFAULT_TOP}.`
      ),
  })
);
export type ListSecureScoresInput = z.infer<typeof ListSecureScoresInputSchema>;
