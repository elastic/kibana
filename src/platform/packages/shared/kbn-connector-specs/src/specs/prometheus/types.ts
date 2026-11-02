/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_ID_LENGTH = 128;
const MAX_LABEL_LENGTH = 200;
const MAX_LABEL_VALUE_LENGTH = 1000;
const MAX_TEXT_LENGTH = 4000;
const MAX_MATCHER_EXPR_LENGTH = 500;
const MAX_MATCHERS = 50;
const MAX_LABEL_ENTRIES = 50;
const MAX_ALERTS_PER_REQUEST = 50;
const MAX_QUERY_LENGTH = 2000;
const MAX_RULE_NAME_LENGTH = 200;

/**
 * A single matcher used in the *body* of postableSilence, per the Alertmanager
 * API v2 `matcher` schema. This is a distinct shape from the `filter`/`match[]`
 * query parameters used by listAlerts/listSilences/listAlertGroups, which take
 * matcher *expression strings* (e.g. `alertname="MyAlert"`), not objects.
 */
export const AlertmanagerMatcherSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(MAX_LABEL_LENGTH)
      .describe('The label name to match on, e.g. "alertname" or "severity".'),
    value: z
      .string()
      .max(MAX_LABEL_VALUE_LENGTH)
      .describe('The label value to match (or regex pattern if isRegex is true).'),
    isRegex: z
      .boolean()
      .optional()
      .describe(
        'Treat value as a RE2 regular expression instead of a literal match. Defaults to false.'
      ),
    isEqual: z
      .boolean()
      .optional()
      .describe(
        'Whether this is an equality match (true) or a negative match (false, i.e. label must NOT equal value). Defaults to true.'
      ),
  })
);
export type AlertmanagerMatcher = z.infer<typeof AlertmanagerMatcherSchema>;

const matcherExprField = () =>
  z
    .string()
    .min(1)
    .max(MAX_MATCHER_EXPR_LENGTH)
    .describe(
      'A single label matcher expression, e.g. \'alertname="HighCPU"\', \'severity=~"critical|warning"\', or \'team!="platform"\'.'
    );

const filterField = () =>
  z
    .array(matcherExprField())
    .max(MAX_MATCHERS)
    .optional()
    .describe(
      'Label matcher expressions to filter results, ANDed together. Each entry is a full expression string like \'alertname="HighCPU"\' (equality), \'severity=~"critical|warning"\' (regex), or \'team!="platform"\' (negative match) — not a bare label name or value.'
    );

const receiverField = () =>
  z
    .string()
    .max(MAX_LABEL_VALUE_LENGTH)
    .optional()
    .describe('A regular expression matching receiver names to filter results by.');

export const ListAlertsInputSchema = lazySchema(() =>
  z.object({
    active: z
      .boolean()
      .optional()
      .describe('Include active/firing alerts in the results. Defaults to true.'),
    silenced: z
      .boolean()
      .optional()
      .describe(
        'Include silenced alerts in the results. Defaults to true (both silenced and non-silenced are returned); set to false to exclude silenced alerts.'
      ),
    inhibited: z
      .boolean()
      .optional()
      .describe(
        'Include inhibited alerts in the results. Defaults to true (both inhibited and non-inhibited are returned); set to false to exclude inhibited alerts.'
      ),
    unprocessed: z
      .boolean()
      .optional()
      .describe(
        'Include unprocessed alerts in the results. Defaults to true; set to false to exclude unprocessed alerts.'
      ),
    filter: filterField(),
    receiver: receiverField(),
  })
);
export type ListAlertsInput = z.infer<typeof ListAlertsInputSchema>;

export const ListSilencesInputSchema = lazySchema(() =>
  z.object({
    filter: filterField(),
  })
);
export type ListSilencesInput = z.infer<typeof ListSilencesInputSchema>;

export const GetSilenceInputSchema = lazySchema(() =>
  z.object({
    silenceId: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .describe('The silence ID, returned by listSilences or createSilence.'),
  })
);
export type GetSilenceInput = z.infer<typeof GetSilenceInputSchema>;

export const CreateSilenceInputSchema = lazySchema(() =>
  z.object({
    matchers: z
      .array(AlertmanagerMatcherSchema)
      .min(1)
      .max(MAX_MATCHERS)
      .describe(
        'Label matchers identifying which alerts this silence mutes. All matchers must match for an alert to be silenced.'
      ),
    startsAt: z
      .string()
      .min(1)
      .max(64)
      .describe('RFC3339 timestamp the silence starts at, e.g. "2026-01-01T00:00:00Z".'),
    endsAt: z
      .string()
      .min(1)
      .max(64)
      .describe('RFC3339 timestamp the silence ends at, e.g. "2026-01-01T02:00:00Z".'),
    createdBy: z
      .string()
      .min(1)
      .max(320)
      .describe('Who or what created the silence, e.g. the workflow name or a user identifier.'),
    comment: z
      .string()
      .min(1)
      .max(MAX_TEXT_LENGTH)
      .describe('Reason for the silence, e.g. "Scheduled maintenance window on api-gateway".'),
  })
);
export type CreateSilenceInput = z.infer<typeof CreateSilenceInputSchema>;

export const ExpireSilenceInputSchema = lazySchema(() =>
  z.object({
    silenceId: z
      .string()
      .min(1)
      .max(MAX_ID_LENGTH)
      .describe('The silence ID to expire, returned by createSilence or listSilences.'),
  })
);
export type ExpireSilenceInput = z.infer<typeof ExpireSilenceInputSchema>;

export const ListAlertGroupsInputSchema = lazySchema(() =>
  z.object({
    active: z
      .boolean()
      .optional()
      .describe('Include active/firing alerts within the returned groups. Defaults to true.'),
    silenced: z
      .boolean()
      .optional()
      .describe('Include silenced alerts within the returned groups. Defaults to true.'),
    inhibited: z
      .boolean()
      .optional()
      .describe('Include inhibited alerts within the returned groups. Defaults to true.'),
    muted: z
      .boolean()
      .optional()
      .describe(
        'Include groups where every alert is muted (silenced or inhibited). Defaults to true; set to false to exclude fully-muted groups.'
      ),
    filter: filterField(),
    receiver: receiverField(),
  })
);
export type ListAlertGroupsInput = z.infer<typeof ListAlertGroupsInputSchema>;

const alertLabelsField = () =>
  z
    .record(z.string().max(MAX_LABEL_LENGTH), z.string().max(MAX_LABEL_VALUE_LENGTH))
    .refine(
      (value) => Object.keys(value).length > 0 && Object.keys(value).length <= MAX_LABEL_ENTRIES,
      {
        message: `labels must contain between 1 and ${MAX_LABEL_ENTRIES} entries`,
      }
    )
    .describe(
      'Label name/value pairs identifying the alert, e.g. { "alertname": "DiskSpaceLow", "severity": "warning", "instance": "db-1" }. Must include at least "alertname" by convention, and at least one entry is required.'
    );

const alertAnnotationsField = () =>
  z
    .record(z.string().max(MAX_LABEL_LENGTH), z.string().max(MAX_TEXT_LENGTH))
    .refine((value) => Object.keys(value).length <= MAX_LABEL_ENTRIES, {
      message: `annotations must contain at most ${MAX_LABEL_ENTRIES} entries`,
    })
    .optional()
    .describe(
      'Non-identifying annotations describing the alert, e.g. { "summary": "Disk usage above 90%" }.'
    );

export const CreateAlertsInputSchema = lazySchema(() =>
  z.object({
    alerts: z
      .array(
        z.object({
          labels: alertLabelsField(),
          annotations: alertAnnotationsField(),
          startsAt: z
            .string()
            .max(64)
            .optional()
            .describe('RFC3339 timestamp the alert starts at. Defaults to now if omitted.'),
          endsAt: z
            .string()
            .max(64)
            .optional()
            .describe(
              'RFC3339 timestamp the alert resolves at. Omit for an alert that stays firing until explicitly resolved (send it again with an endsAt in the past to resolve it early).'
            ),
          generatorURL: z
            .string()
            .url()
            .max(2000)
            .optional()
            .describe(
              'A URL pointing back to the source that generated this alert, shown in notifications.'
            ),
        })
      )
      .min(1)
      .max(MAX_ALERTS_PER_REQUEST)
      .describe(
        `One or more alerts to push into Alertmanager (max ${MAX_ALERTS_PER_REQUEST} per call).`
      ),
  })
);
export type CreateAlertsInput = z.infer<typeof CreateAlertsInputSchema>;

export const GetStatusInputSchema = lazySchema(() => z.object({}));
export type GetStatusInput = z.infer<typeof GetStatusInputSchema>;

export const QueryPrometheusInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(MAX_QUERY_LENGTH)
      .describe(
        "A PromQL expression to evaluate, e.g. 'up{job=\"node\"}' or 'rate(http_requests_total[5m])'."
      ),
    time: z
      .string()
      .max(64)
      .optional()
      .describe(
        'RFC3339 timestamp (or Unix epoch seconds) to evaluate the query at. Defaults to the current server time.'
      ),
  })
);
export type QueryPrometheusInput = z.infer<typeof QueryPrometheusInputSchema>;

export const ListPrometheusAlertsInputSchema = lazySchema(() => z.object({}));
export type ListPrometheusAlertsInput = z.infer<typeof ListPrometheusAlertsInputSchema>;

export const ListPrometheusRulesInputSchema = lazySchema(() =>
  z.object({
    type: z
      .enum(['alert', 'record'])
      .optional()
      .describe(
        'Restrict to alerting rules ("alert") or recording rules ("record"). Omit for both.'
      ),
    ruleName: z
      .array(z.string().max(MAX_RULE_NAME_LENGTH))
      .max(MAX_MATCHERS)
      .optional()
      .describe('Only return rules with one of these exact names.'),
    ruleGroup: z
      .array(z.string().max(MAX_RULE_NAME_LENGTH))
      .max(MAX_MATCHERS)
      .optional()
      .describe('Only return rules belonging to one of these rule group names.'),
  })
);
export type ListPrometheusRulesInput = z.infer<typeof ListPrometheusRulesInputSchema>;

const rangeTimeField = (bound: 'start' | 'end') =>
  z
    .string()
    .min(1)
    .max(64)
    .describe(
      `RFC3339 timestamp (or Unix epoch seconds) for the ${bound} of the range, e.g. "2026-01-01T00:00:00Z".`
    );

export const QueryRangePrometheusInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(MAX_QUERY_LENGTH)
      .describe(
        "A PromQL expression to evaluate over the range, e.g. 'rate(http_requests_total[5m])'."
      ),
    start: rangeTimeField('start'),
    end: rangeTimeField('end'),
    step: z
      .string()
      .min(1)
      .max(32)
      .describe(
        'Query resolution step width, e.g. "15s", "1m", "1h", or a plain number of seconds.'
      ),
  })
);
export type QueryRangePrometheusInput = z.infer<typeof QueryRangePrometheusInputSchema>;

export const ListPrometheusTargetsInputSchema = lazySchema(() =>
  z.object({
    state: z
      .enum(['active', 'dropped', 'any'])
      .optional()
      .describe(
        'Restrict to "active" (currently scraped) or "dropped" (relabeled away) targets. Defaults to "any", returning both.'
      ),
  })
);
export type ListPrometheusTargetsInput = z.infer<typeof ListPrometheusTargetsInputSchema>;

const seriesMatchField = () =>
  z
    .array(matcherExprField())
    .min(1)
    .max(MAX_MATCHERS)
    .describe(
      "One or more series selector expressions, e.g. 'up{job=\"node\"}' or 'process_start_time_seconds'. The result is the union of all matches."
    );

const optionalRangeTimeField = (bound: 'start' | 'end') =>
  z
    .string()
    .max(64)
    .optional()
    .describe(
      `Optional RFC3339 timestamp (or Unix epoch seconds) for the ${bound} of the time range. If omitted, Prometheus uses its own default.`
    );

export const GetPrometheusSeriesInputSchema = lazySchema(() =>
  z.object({
    match: seriesMatchField(),
    start: optionalRangeTimeField('start'),
    end: optionalRangeTimeField('end'),
  })
);
export type GetPrometheusSeriesInput = z.infer<typeof GetPrometheusSeriesInputSchema>;

export const ListPrometheusLabelValuesInputSchema = lazySchema(() =>
  z.object({
    label: z
      .string()
      .min(1)
      .max(MAX_LABEL_LENGTH)
      .describe('The label name to list known values for, e.g. "job" or "instance".'),
    match: z
      .array(matcherExprField())
      .max(MAX_MATCHERS)
      .optional()
      .describe('Optional series selector expressions to restrict which series are considered.'),
    start: optionalRangeTimeField('start'),
    end: optionalRangeTimeField('end'),
  })
);
export type ListPrometheusLabelValuesInput = z.infer<typeof ListPrometheusLabelValuesInputSchema>;

// ---------------------------------------------------------------------------
// Lightweight response shapes (only the fields the connector reads/documents)
// ---------------------------------------------------------------------------

export interface AlertmanagerAlert {
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  receivers?: Array<{ name?: string }>;
  fingerprint?: string;
  startsAt?: string;
  updatedAt?: string;
  endsAt?: string;
  generatorURL?: string;
  status?: { state?: string; silencedBy?: string[]; inhibitedBy?: string[]; mutedBy?: string[] };
}

export interface AlertmanagerSilence {
  id: string;
  status?: { state?: string };
  matchers?: AlertmanagerMatcher[];
  startsAt?: string;
  endsAt?: string;
  updatedAt?: string;
  createdBy?: string;
  comment?: string;
}

export interface AlertmanagerAlertGroup {
  labels?: Record<string, string>;
  routeLabels?: Record<string, string>;
  receiver?: { name?: string };
  alerts?: AlertmanagerAlert[];
}

export interface AlertmanagerStatus {
  cluster?: { name?: string; status?: string; peers?: Array<{ name?: string; address?: string }> };
  versionInfo?: { version?: string; revision?: string; branch?: string; buildDate?: string };
  uptime?: string;
}
