/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

// The pattern SSM's model gives InstanceId: an EC2 instance (i-) or a hybrid managed node (mi-).
const INSTANCE_ID_PATTERN = /^(i-(\w{8}|\w{17})|mi-\w{17})$/;
const INSTANCE_ID_MAX_LENGTH = 20;
// SendCommand and CancelCommand take at most 50 instance IDs.
export const COMMAND_INSTANCE_IDS_MAX = 50;
// The characters SSM's model allows in a document name or ARN, and the pattern it gives
// DocumentVersion.
const DOCUMENT_NAME_PATTERN = /^[a-zA-Z0-9_\-.:/]+$/;
const DOCUMENT_NAME_MIN_LENGTH = 3;
const DOCUMENT_NAME_MAX_LENGTH = 128;
// SSM's model caps a document name or ARN at 128 characters, too short for an ARN, but SSM itself
// allows 200.
const DOCUMENT_ARN_MAX_LENGTH = 200;
const DOCUMENT_VERSION_PATTERN = /^(\$LATEST|\$DEFAULT|[1-9][0-9]*)$/;
const DOCUMENT_VERSION_MAX_LENGTH = 16;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_LENGTH = 36;
// SSM's model only fixes the length of an automation execution ID, not its format.
const AUTOMATION_EXECUTION_ID_LENGTH = 36;
export const PARAMETER_NAME_MAX_LENGTH = 2048;
// SSM documents no length limit for NextToken; this only guards against unbounded input.
const NEXT_TOKEN_MAX_LENGTH = 4096;
const TIMESTAMP_MAX_LENGTH = 64;
// The pattern SSM's model gives an inventory type name.
const INVENTORY_TYPE_NAME_PATTERN = /^(AWS|Custom):.+$/;
const INVENTORY_TYPE_NAME_MAX_LENGTH = 100;
const INVENTORY_FILTERS_MAX = 5;
const INVENTORY_FILTER_KEY_MAX_LENGTH = 200;
const INVENTORY_FILTER_VALUES_MAX = 40;
// SSM documents no length limit for an inventory filter value; this only guards against unbounded input.
const INVENTORY_FILTER_VALUE_MAX_LENGTH = 256;
// SSM's Exists type only works together with aggregators, which the connector does not send.
const INVENTORY_FILTER_TYPES = [
  'Equal',
  'NotEqual',
  'BeginWith',
  'LessThan',
  'GreaterThan',
] as const;

/** A `Key`/`Values` filter, as DescribeInstanceInformation and ListDocuments take them. */
export interface SsmFilter {
  Key: string;
  Values: string[];
}

/** A `Key`/`Values`/`Type` filter, as GetInventory and ListInventoryEntries take them. */
export interface SsmInventoryFilter extends SsmFilter {
  Type?: (typeof INVENTORY_FILTER_TYPES)[number];
}

export const instanceIdSchema = () =>
  z
    .string()
    .max(INSTANCE_ID_MAX_LENGTH)
    .regex(
      INSTANCE_ID_PATTERN,
      'Must be an EC2 instance ID (i-...) or a managed node ID (mi-...).'
    );

export const uuidSchema = (message: string) =>
  z.string().min(UUID_LENGTH).max(UUID_LENGTH).regex(UUID_PATTERN, message);

export const commandIdSchema = () => uuidSchema('Must be a command ID returned by sendCommand.');

export const automationExecutionIdSchema = () =>
  z.string().min(AUTOMATION_EXECUTION_ID_LENGTH).max(AUTOMATION_EXECUTION_ID_LENGTH);

export const documentNameSchema = () =>
  z
    .string()
    .min(DOCUMENT_NAME_MIN_LENGTH)
    .max(DOCUMENT_NAME_MAX_LENGTH)
    .regex(DOCUMENT_NAME_PATTERN, 'Must be the name of an SSM document.');

export const documentNameOrArnSchema = () =>
  z
    .string()
    .min(DOCUMENT_NAME_MIN_LENGTH)
    .max(DOCUMENT_ARN_MAX_LENGTH)
    .regex(DOCUMENT_NAME_PATTERN, 'Must be the name or ARN of an SSM document.');

export const documentVersionSchema = () =>
  z
    .string()
    .max(DOCUMENT_VERSION_MAX_LENGTH)
    .regex(DOCUMENT_VERSION_PATTERN, 'Must be $DEFAULT, $LATEST, or a version number.');

export const nextTokenSchema = () =>
  z
    .string()
    .max(NEXT_TOKEN_MAX_LENGTH)
    .nullish()
    .describe('Pagination token from a previous response. Omit to fetch the first page.');

export const timestampSchema = () => z.iso.datetime({ offset: true }).max(TIMESTAMP_MAX_LENGTH);

export const inventoryTypeNameSchema = () =>
  z
    .string()
    .max(INVENTORY_TYPE_NAME_MAX_LENGTH)
    .regex(INVENTORY_TYPE_NAME_PATTERN, 'Must be an inventory type, e.g. AWS:Application.');

export const inventoryFiltersSchema = (keyDescription: string) =>
  z
    .array(
      z.object({
        key: z.string().min(1).max(INVENTORY_FILTER_KEY_MAX_LENGTH).describe(keyDescription),
        values: z
          .array(z.string().min(1).max(INVENTORY_FILTER_VALUE_MAX_LENGTH))
          .min(1)
          .max(INVENTORY_FILTER_VALUES_MAX)
          .describe('The values to compare the attribute with.'),
        type: z
          .enum(INVENTORY_FILTER_TYPES)
          .optional()
          .describe('How to compare. Defaults to Equal.'),
      })
    )
    .min(1)
    .max(INVENTORY_FILTERS_MAX);

export const toInventoryFilters = (
  filters: ReadonlyArray<{ key: string; values: string[]; type?: SsmInventoryFilter['Type'] }>
): SsmInventoryFilter[] =>
  filters.map(({ key, values, type }) => ({ Key: key, Values: values, Type: type }));

// SSM answers an empty string on the last page.
export const toNextToken = (nextToken: string | undefined): string | null => nextToken || null;

// SSM returns timestamps as epoch seconds.
export const toIsoDate = (epochSeconds: number | undefined): string | undefined =>
  epochSeconds === undefined ? undefined : new Date(epochSeconds * 1000).toISOString();

// Any status not listed here, including ones AWS adds later, keeps the agent polling.
const FINAL_AUTOMATION_STATUSES: ReadonlySet<string> = new Set([
  'Success',
  'Failed',
  'TimedOut',
  'Cancelled',
  'Rejected',
  'ChangeCalendarOverrideRejected',
  'CompletedWithSuccess',
  'CompletedWithFailure',
  'Exited',
]);

export const isAutomationFinished = (status: string | undefined): boolean =>
  status !== undefined && FINAL_AUTOMATION_STATUSES.has(status);
