/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import {
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  ALERTS_DEFAULT_MAX_RESULTS,
  ALERTS_MAX_RESULTS,
  ALERTS_PAGE_SIZE,
  DATE_TIME_TARGETS,
  ENDPOINT_SELECT_FIELDS,
  INVESTIGATION_RESULTS,
  OAT_FILTER_MAX,
} from './constants';

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
/** Workbench alert, response task and sandbox submission ids: letters, digits and dashes. */
export const ID_PATTERN = /^[A-Za-z0-9-]+$/;
export const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const dateTime = (what: string) =>
  z
    .string()
    .max(20)
    .regex(ISO_UTC, 'Use ISO 8601 UTC, for example 2026-11-01T00:00:00Z')
    .describe(`${what}, ISO 8601 UTC (yyyy-MM-ddThh:mm:ssZ).`);

export const idField = (what: string) =>
  z
    .string()
    .trim()
    .min(1, `${what} must not be blank`)
    .max(36)
    .regex(ID_PATTERN, `${what} has letters, digits and dashes only`);

export const nextLinkField = () =>
  z
    .string()
    .max(4096)
    .optional()
    .describe(
      'nextLink from the previous call, to read the next page. Pass the same filters again (and maxResults for listAlerts); the time range, sort, page size and selected fields come from the link.'
    );

/** Sort fields the product documents for alerts (investigationStatus is deprecated and left out). */
const ALERT_SORT_FIELDS =
  'id|caseId|name|status|investigationResult|modelId|model|score|severity|createdDateTime|updatedDateTime|firstInvestigatedDateTime';
const ALERT_ORDER_BY = new RegExp(
  `^(${ALERT_SORT_FIELDS})( (asc|desc))?(,(${ALERT_SORT_FIELDS})( (asc|desc))?)*$`
);
/** Sort fields the product documents for endpoints. */
const ENDPOINT_ORDER_BY =
  /^(agentGuid|edrSensorLastConnectedDateTime|eppAgentLastConnectedDateTime|eppAgentLastScannedDateTime)( (asc|desc))?$/;

const statusField = () => z.enum(ALERT_STATUSES);
const resultField = () => z.enum(INVESTIGATION_RESULTS);

export const ListAlertsInputSchema = lazySchema(() =>
  z.object({
    startDateTime: dateTime('Start of the time range').optional(),
    endDateTime: dateTime('End of the time range').optional(),
    dateTimeTarget: z
      .enum(DATE_TIME_TARGETS)
      .optional()
      .describe('Timestamp the range applies to (default createdDateTime).'),
    status: statusField().optional().describe('Only alerts with this status.'),
    investigationResult: resultField().optional().describe('Only alerts with this result.'),
    severity: z.enum(ALERT_SEVERITIES).optional().describe('Only alerts with this severity.'),
    orderBy: z
      .string()
      .max(200)
      .regex(ALERT_ORDER_BY, 'Use sortable alert fields with asc or desc, comma separated')
      .optional()
      .describe(
        "Sort, for example 'createdDateTime desc' (default) or 'severity desc,score desc'; fields: id, caseId, name, status, investigationResult, modelId, model, score, severity, createdDateTime, updatedDateTime, firstInvestigatedDateTime."
      ),
    maxResults: z
      .number()
      .int()
      .min(ALERTS_PAGE_SIZE)
      .max(ALERTS_MAX_RESULTS)
      .default(ALERTS_DEFAULT_MAX_RESULTS)
      .describe('Alerts to read, 10-200 (default 50), in pages of 10.'),
    nextLink: nextLinkField(),
  })
);
export type ListAlertsInput = z.infer<typeof ListAlertsInputSchema>;

export const GetAlertDetailsInputSchema = lazySchema(() =>
  z.object({
    id: idField('id').describe('Workbench alert id, for example WB-14-20190709-00003.'),
  })
);
export type GetAlertDetailsInput = z.infer<typeof GetAlertDetailsInputSchema>;

export const UpdateAlertStatusInputSchema = lazySchema(() =>
  z
    .object({
      id: idField('id').describe('Workbench alert id.'),
      status: statusField().optional().describe('New status.'),
      investigationResult: resultField().optional().describe('New investigation result.'),
      etag: z
        .string()
        .max(128)
        .optional()
        .describe('etag from getAlertDetails; the update fails if the alert changed since then.'),
    })
    .refine((input) => input.status !== undefined || input.investigationResult !== undefined, {
      message: 'Give status, investigationResult or both',
    })
);
export type UpdateAlertStatusInput = z.infer<typeof UpdateAlertStatusInputSchema>;

export const AddAlertNoteInputSchema = lazySchema(() =>
  z.object({
    alertId: idField('alertId').describe('Workbench alert id.'),
    content: z.string().min(1).max(500000).describe('Note text.'),
  })
);
export type AddAlertNoteInput = z.infer<typeof AddAlertNoteInputSchema>;

const oatDate = (what: string) =>
  z
    .string()
    .max(40)
    .regex(ISO_UTC, 'Use ISO 8601 UTC, for example 2026-11-01T00:00:00Z')
    .optional()
    .describe(`${what}, ISO 8601 UTC.`);

export const ListOatInputSchema = lazySchema(() =>
  z
    .object({
      detectedStartDateTime: oatDate('Start of the detection time range'),
      detectedEndDateTime: oatDate('End of the detection time range'),
      ingestedStartDateTime: oatDate('Start of the ingestion time range'),
      ingestedEndDateTime: oatDate('End of the ingestion time range'),
      // An OAT item is about 6 KB: 100 items stay under the 1 MB response limit
      // (xpack.actions.maxResponseContentLength); the product's 200 would not.
      top: z
        .union([z.literal(50), z.literal(100)])
        .optional()
        .describe('Page size: 50 (default) or 100.'),
      filter: z
        .string()
        .max(OAT_FILTER_MAX)
        .optional()
        .describe("TMV1-Filter expression, for example riskLevel eq 'high'."),
      nextLink: nextLinkField(),
    })
    .refine(
      (input) =>
        (input.detectedStartDateTime === undefined) === (input.detectedEndDateTime === undefined),
      { message: 'Give both detectedStartDateTime and detectedEndDateTime, or neither' }
    )
    .refine(
      (input) =>
        (input.ingestedStartDateTime === undefined) === (input.ingestedEndDateTime === undefined),
      { message: 'Give both ingestedStartDateTime and ingestedEndDateTime, or neither' }
    )
);
export type ListOatInput = z.infer<typeof ListOatInputSchema>;

export const ListEndpointsInputSchema = lazySchema(() =>
  z.object({
    agentGuid: z
      .string()
      .trim()
      .max(36)
      .regex(UUID_PATTERN, 'agentGuid is a UUID')
      .optional()
      .describe('Only the endpoint with this agent GUID.'),
    endpointName: z
      .string()
      .max(255)
      .optional()
      .describe('Only endpoints with this computer name.'),
    filter: z
      .string()
      .max(1024)
      .optional()
      .describe("TMV1-Filter expression, for example osPlatform eq 'windows'."),
    // An endpoint item is about 3.2 KB with all fields: 200 items (about 640 KB) stay under the
    // 1 MB response limit (xpack.actions.maxResponseContentLength); the product's 500 and 1000 would not.
    top: z
      .union([z.literal(10), z.literal(50), z.literal(100), z.literal(200)])
      .optional()
      .describe('Page size: 10, 50, 100 (default) or 200.'),
    select: z
      .array(z.enum(ENDPOINT_SELECT_FIELDS))
      .max(10)
      .refine((fields) => fields.join(',').length <= 128, {
        message: 'The selected field names exceed 128 characters together',
      })
      .optional()
      .describe('Fields to return, for example ["agentGuid","endpointName","isolationStatus"].'),
    orderBy: z
      .string()
      .max(128)
      .regex(ENDPOINT_ORDER_BY, 'Sort by a documented endpoint field')
      .optional()
      .describe(
        'Sort: agentGuid (default), edrSensorLastConnectedDateTime, eppAgentLastConnectedDateTime or eppAgentLastScannedDateTime, optionally with asc or desc.'
      ),
    nextLink: nextLinkField(),
  })
);
export type ListEndpointsInput = z.infer<typeof ListEndpointsInputSchema>;
