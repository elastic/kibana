/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  assertApplied,
  compact,
  requireIds,
  requireScope,
  s1Request,
  toListResult,
} from './client';
import { ACTION_DESCRIPTIONS } from './descriptions';
import type { StarRule } from './star_rule';
import { mergeStarRule, starRuleScopeFilter } from './star_rule';
import {
  CreateStarRuleInputSchema,
  DeleteStarRuleInputSchema,
  DisableStarRulesInputSchema,
  EnableStarRulesInputSchema,
  SearchAlertsInputSchema,
  UpdateAlertStatusInputSchema,
  UpdateAlertVerdictInputSchema,
  UpdateStarRuleInputSchema,
} from './detection_types';
import type {
  CreateStarRuleInput,
  DeleteStarRuleInput,
  DisableStarRulesInput,
  EnableStarRulesInput,
  SearchAlertsInput,
  UpdateAlertStatusInput,
  UpdateAlertVerdictInput,
  UpdateStarRuleInput,
} from './detection_types';

const EMPTY_ALERT_IDS =
  'alertIds must list at least one alert id (an empty filter would target every alert)';
const EMPTY_RULE_IDS =
  'ruleIds must list at least one rule id (an empty filter would target every rule)';

/** Alert and STAR rule writes send `{ filter: { ids }, data? }` and fail on per-item errors. */
const idsFilterAction = async (
  ctx: ActionContext,
  action: string,
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  ids: string[],
  data?: Record<string, unknown>
) => {
  const body = await s1Request(ctx, {
    action,
    method,
    path,
    body: { filter: { ids }, ...(data ? { data } : {}) },
    mutating: true,
  });
  return assertApplied(action, ids, body);
};

export const detectionActions: ConnectorSpec['actions'] = {
  searchAlerts: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.searchAlerts,
    input: SearchAlertsInputSchema,
    handler: async (ctx, input: SearchAlertsInput) =>
      toListResult(
        await s1Request(ctx, {
          action: 'searchAlerts',
          method: 'GET',
          path: '/cloud-detection/alerts',
          params: input,
          mutating: false,
        })
      ),
  },

  updateAlertVerdict: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.updateAlertVerdict,
    input: UpdateAlertVerdictInputSchema,
    handler: async (ctx, input: UpdateAlertVerdictInput) =>
      idsFilterAction(
        ctx,
        'updateAlertVerdict',
        'POST',
        '/cloud-detection/alerts/analyst-verdict',
        requireIds(input.alertIds, EMPTY_ALERT_IDS),
        { analystVerdict: input.analystVerdict }
      ),
  },

  updateAlertStatus: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.updateAlertStatus,
    input: UpdateAlertStatusInputSchema,
    handler: async (ctx, input: UpdateAlertStatusInput) =>
      idsFilterAction(
        ctx,
        'updateAlertStatus',
        'POST',
        '/cloud-detection/alerts/incident',
        requireIds(input.alertIds, EMPTY_ALERT_IDS),
        { incidentStatus: input.incidentStatus }
      ),
  },

  createStarRule: {
    isTool: true,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.createStarRule,
    input: CreateStarRuleInputSchema,
    handler: async (ctx, input: CreateStarRuleInput) => {
      const { accountIds, siteIds, groupIds, tenant, ...rule } = input;
      const filter = requireScope('createStarRule', { accountIds, siteIds, groupIds, tenant });
      const expirationMode = rule.expirationMode ?? 'Permanent';
      if (expirationMode === 'Temporary' && !rule.expiration) {
        throw new Error('createStarRule: expiration is required when expirationMode is Temporary');
      }
      return s1Request(ctx, {
        action: 'createStarRule',
        method: 'POST',
        path: '/cloud-detection/rules',
        body: {
          data: compact({ ...rule, status: rule.status ?? 'Draft', expirationMode }),
          filter,
        },
        mutating: true,
      });
    },
  },

  updateStarRule: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.updateStarRule,
    input: UpdateStarRuleInputSchema,
    handler: async (ctx, input: UpdateStarRuleInput) => {
      const { ruleId, ...changes } = input;
      if (Object.values(changes).every((value) => value === undefined)) {
        throw new Error('updateStarRule needs at least one field to change');
      }
      const lookup = toListResult(
        await s1Request(ctx, {
          action: 'updateStarRule',
          method: 'GET',
          path: '/cloud-detection/rules',
          params: { ids: [ruleId], limit: 1 },
          mutating: false,
        })
      );
      const previous = lookup.data.find((rule) => String((rule as StarRule).id) === ruleId) as
        | StarRule
        | undefined;
      if (!previous) {
        throw new Error(`STAR rule [${ruleId}] not found`);
      }
      const data = mergeStarRule(previous, changes);
      // The API requires expirationMode on every update; a rule that lacks it is Permanent.
      if (data.expirationMode === undefined) data.expirationMode = 'Permanent';
      if (data.expirationMode === 'Temporary' && !data.expiration) {
        throw new Error('updateStarRule: expiration is required when expirationMode is Temporary');
      }
      const body = await s1Request(ctx, {
        action: 'updateStarRule',
        method: 'PUT',
        path: `/cloud-detection/rules/${encodeURIComponent(ruleId)}`,
        body: { data, filter: starRuleScopeFilter(previous) },
        mutating: true,
      });
      return { ...body, previous };
    },
  },

  enableStarRules: {
    isTool: true,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.enableStarRules,
    input: EnableStarRulesInputSchema,
    handler: async (ctx, input: EnableStarRulesInput) =>
      idsFilterAction(
        ctx,
        'enableStarRules',
        'PUT',
        '/cloud-detection/rules/enable',
        requireIds(input.ruleIds, EMPTY_RULE_IDS)
      ),
  },

  disableStarRules: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.disableStarRules,
    input: DisableStarRulesInputSchema,
    handler: async (ctx, input: DisableStarRulesInput) =>
      idsFilterAction(
        ctx,
        'disableStarRules',
        'PUT',
        '/cloud-detection/rules/disable',
        requireIds(input.ruleIds, EMPTY_RULE_IDS)
      ),
  },

  deleteStarRule: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.deleteStarRule,
    input: DeleteStarRuleInputSchema,
    handler: async (ctx, input: DeleteStarRuleInput) =>
      idsFilterAction(
        ctx,
        'deleteStarRule',
        'DELETE',
        '/cloud-detection/rules',
        requireIds(input.ruleIds, EMPTY_RULE_IDS)
      ),
  },
};
