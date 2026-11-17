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
export const SEND_COMMAND_INSTANCE_IDS_MAX = 50;
// The patterns SSM's model gives the DocumentName and DocumentVersion of SendCommand and
// StartAutomationExecution.
const DOCUMENT_NAME_PATTERN = /^[a-zA-Z0-9_\-.:/]{3,128}$/;
const DOCUMENT_NAME_MAX_LENGTH = 128;
const DOCUMENT_VERSION_PATTERN = /^(\$LATEST|\$DEFAULT|[1-9][0-9]*)$/;
const DOCUMENT_VERSION_MAX_LENGTH = 16;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const UUID_LENGTH = 36;
// SSM's model only fixes the length of an automation execution ID, not its format.
const AUTOMATION_EXECUTION_ID_LENGTH = 36;

export const instanceIdSchema = () =>
  z
    .string()
    .max(INSTANCE_ID_MAX_LENGTH)
    .regex(
      INSTANCE_ID_PATTERN,
      'Must be an EC2 instance ID (i-...) or a managed node ID (mi-...).'
    );

export const commandIdSchema = () =>
  z
    .string()
    .min(UUID_LENGTH)
    .max(UUID_LENGTH)
    .regex(UUID_PATTERN, 'Must be a command ID returned by sendCommand.');

export const automationExecutionIdSchema = () =>
  z.string().min(AUTOMATION_EXECUTION_ID_LENGTH).max(AUTOMATION_EXECUTION_ID_LENGTH);

export const documentNameSchema = () =>
  z
    .string()
    .max(DOCUMENT_NAME_MAX_LENGTH)
    .regex(DOCUMENT_NAME_PATTERN, 'Must be the name or ARN of an SSM document.');

export const documentVersionSchema = () =>
  z
    .string()
    .max(DOCUMENT_VERSION_MAX_LENGTH)
    .regex(DOCUMENT_VERSION_PATTERN, 'Must be $DEFAULT, $LATEST, or a version number.');

// SSM returns timestamps as epoch seconds.
export const toIsoDate = (epochSeconds: number | undefined): string | undefined =>
  epochSeconds === undefined ? undefined : new Date(epochSeconds * 1000).toISOString();
