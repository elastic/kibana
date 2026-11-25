/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDefinition } from '../../connector_spec';
import { graphRequest } from './client';
import {
  CreateDetectionRuleInputSchema,
  DeleteDetectionRuleInputSchema,
  GetDetectionRuleInputSchema,
  ListDetectionRulesInputSchema,
  UpdateDetectionRuleInputSchema,
} from './types';
import type {
  CreateDetectionRuleInput,
  DeleteDetectionRuleInput,
  GetDetectionRuleInput,
  ListDetectionRulesInput,
  UpdateDetectionRuleInput,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const detectionRuleActions: Record<string, ActionDefinition<any, any, any>> = {
  listDetectionRules: {
    isTool: true,
    scope: 'read',
    description:
      'List custom hunting-based detection rules configured in Microsoft Defender XDR. ' +
      'Use to audit what rules are already generating alerts, ' +
      'or to retrieve rule IDs for reference.',
    input: ListDetectionRulesInputSchema,
    handler: async (ctx, input: ListDetectionRulesInput) => {
      const data = await graphRequest(
        ctx,
        'get',
        '/security/rules/detectionRules',
        'listDetectionRules',
        {
          params: { $top: input.top, $skip: input.skip },
        }
      );
      return { value: data?.value ?? [], nextLink: data?.['@odata.nextLink'] ?? null };
    },
  },

  getDetectionRule: {
    isTool: true,
    scope: 'read',
    description:
      'Retrieve full details for a single custom detection rule by its numeric ID, ' +
      'including its KQL query, schedule, alert template, and trigger settings.',
    input: GetDetectionRuleInputSchema,
    handler: async (ctx, input: GetDetectionRuleInput) =>
      graphRequest(
        ctx,
        'get',
        `/security/rules/detectionRules/${encodeURIComponent(input.ruleId)}`,
        'getDetectionRule'
      ),
  },

  createDetectionRule: {
    isTool: false,
    scope: 'destroy',
    description:
      'Create a new custom hunting-based detection rule in Microsoft Defender XDR. ' +
      'The rule runs a KQL query on the specified schedule and generates alerts when the result count ' +
      'satisfies the trigger condition. The query must project at least one of: ' +
      'DeviceId, AccountObjectId, AccountSid, AccountUpn, AccountName, MailboxAddress, FileName, SHA256, IPAddress, URL.',
    input: CreateDetectionRuleInputSchema,
    handler: async (ctx, input: CreateDetectionRuleInput) =>
      graphRequest(ctx, 'post', '/security/rules/detectionRules', 'createDetectionRule', {
        body: {
          displayName: input.displayName,
          status: input.status,
          queryCondition: { queryText: input.queryText },
          schedule: { frequency: input.period },
          detectionAction: { alertTemplate: input.alertTemplate },
        },
      }),
  },

  updateDetectionRule: {
    isTool: false,
    scope: 'destroy',
    description:
      'Update an existing custom detection rule — change its display name, enable/disable it, ' +
      'modify the KQL query, adjust the schedule period, update the alert template, or change trigger settings. ' +
      'Provide only the fields you want to change.',
    input: UpdateDetectionRuleInputSchema,
    handler: async (ctx, input: UpdateDetectionRuleInput) => {
      const { ruleId, ...fields } = input;
      const body: Record<string, unknown> = {};
      if (fields.displayName !== undefined) body.displayName = fields.displayName;
      if (fields.status !== undefined) body.status = fields.status;
      if (fields.queryText !== undefined) body.queryCondition = { queryText: fields.queryText };
      if (fields.period !== undefined) body.schedule = { frequency: fields.period };
      if (fields.alertTemplate !== undefined)
        body.detectionAction = { alertTemplate: fields.alertTemplate };
      return graphRequest(
        ctx,
        'patch',
        `/security/rules/detectionRules/${encodeURIComponent(ruleId)}`,
        'updateDetectionRule',
        { body }
      );
    },
  },

  deleteDetectionRule: {
    isTool: false,
    scope: 'destroy',
    description:
      'Delete a custom detection rule by its numeric ID. ' +
      'Use to retire a detection that is no longer relevant or has been superseded. ' +
      'This action is irreversible — confirm the rule ID with listDetectionRules or getDetectionRule first.',
    input: DeleteDetectionRuleInputSchema,
    handler: async (ctx, input: DeleteDetectionRuleInput) => {
      await graphRequest(
        ctx,
        'delete',
        `/security/rules/detectionRules/${encodeURIComponent(input.ruleId)}`,
        'deleteDetectionRule'
      );
      return { deleted: true, ruleId: input.ruleId };
    },
  },
};
