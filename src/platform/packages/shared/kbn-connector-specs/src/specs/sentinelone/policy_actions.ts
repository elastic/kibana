/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../connector_spec';
import {
  assertApplied,
  compact,
  requireIds,
  requireScope,
  s1Request,
  toListResult,
} from './client';
import { BLOCKLIST_TYPE } from './constants';
import { ACTION_DESCRIPTIONS } from './descriptions';
import {
  AddHashToBlocklistInputSchema,
  CreateExclusionInputSchema,
  CreateFirewallRuleInputSchema,
  CreateIOCInputSchema,
  DeleteExclusionInputSchema,
  DeleteFirewallRuleInputSchema,
  DeleteIOCInputSchema,
  ListExclusionsInputSchema,
  ListFirewallRulesInputSchema,
  RemoveHashFromBlocklistInputSchema,
  SearchBlocklistInputSchema,
  SearchIOCsInputSchema,
} from './policy_types';
import type {
  AddHashToBlocklistInput,
  CreateExclusionInput,
  CreateFirewallRuleInput,
  CreateIOCInput,
  DeleteExclusionInput,
  DeleteFirewallRuleInput,
  DeleteIOCInput,
  ListExclusionsInput,
  ListFirewallRulesInput,
  RemoveHashFromBlocklistInput,
  SearchBlocklistInput,
  SearchIOCsInput,
} from './policy_types';

const EMPTY_IDS = 'ids must list at least one id (an empty filter would target every object)';

export const policyActions: ConnectorSpec['actions'] = {
  searchBlocklist: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.searchBlocklist,
    input: SearchBlocklistInputSchema,
    handler: async (ctx, input: SearchBlocklistInput) =>
      toListResult(
        await s1Request(ctx, {
          action: 'searchBlocklist',
          method: 'GET',
          path: '/restrictions',
          params: { ...input, type: BLOCKLIST_TYPE },
          mutating: false,
        })
      ),
  },

  addHashToBlocklist: {
    isTool: true,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.addHashToBlocklist,
    input: AddHashToBlocklistInputSchema,
    handler: async (ctx, input: AddHashToBlocklistInput) => {
      const { accountIds, siteIds, groupIds, tenant, sha1, sha256, ...rest } = input;
      if (!sha1 && !sha256) {
        throw new Error('addHashToBlocklist needs sha1 or sha256');
      }
      const filter = requireScope('addHashToBlocklist', { accountIds, siteIds, groupIds, tenant });
      const body = await s1Request(ctx, {
        action: 'addHashToBlocklist',
        method: 'POST',
        path: '/restrictions',
        body: {
          data: compact({ ...rest, type: BLOCKLIST_TYPE, value: sha1, sha256Value: sha256 }),
          filter,
        },
        mutating: true,
      });
      return assertApplied('addHashToBlocklist', [sha1 ?? sha256 ?? ''], body);
    },
  },

  removeHashFromBlocklist: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.removeHashFromBlocklist,
    input: RemoveHashFromBlocklistInputSchema,
    handler: async (ctx, input: RemoveHashFromBlocklistInput) => {
      const ids = requireIds(input.ids, EMPTY_IDS);
      const body = await s1Request(ctx, {
        action: 'removeHashFromBlocklist',
        method: 'DELETE',
        path: '/restrictions',
        body: { data: { type: BLOCKLIST_TYPE, ids } },
        mutating: true,
      });
      return assertApplied('removeHashFromBlocklist', ids, body);
    },
  },

  listExclusions: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.listExclusions,
    input: ListExclusionsInputSchema,
    handler: async (ctx, input: ListExclusionsInput) =>
      toListResult(
        await s1Request(ctx, {
          action: 'listExclusions',
          method: 'GET',
          path: '/exclusions',
          params: input,
          mutating: false,
        })
      ),
  },

  createExclusion: {
    isTool: false,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.createExclusion,
    input: CreateExclusionInputSchema,
    handler: async (ctx, input: CreateExclusionInput) => {
      const { accountIds, siteIds, groupIds, tenant, ...exclusion } = input;
      const filter = requireScope('createExclusion', { accountIds, siteIds, groupIds, tenant });
      const body = await s1Request(ctx, {
        action: 'createExclusion',
        method: 'POST',
        path: '/exclusions',
        body: { data: compact(exclusion), filter },
        mutating: true,
      });
      return assertApplied('createExclusion', [exclusion.value], body);
    },
  },

  deleteExclusion: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.deleteExclusion,
    input: DeleteExclusionInputSchema,
    handler: async (ctx, input: DeleteExclusionInput) => {
      const ids = requireIds(input.ids, EMPTY_IDS);
      const body = await s1Request(ctx, {
        action: 'deleteExclusion',
        method: 'DELETE',
        path: '/exclusions',
        body: { data: compact({ ids, type: input.type }) },
        mutating: true,
      });
      return assertApplied('deleteExclusion', ids, body);
    },
  },

  searchIOCs: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.searchIOCs,
    input: SearchIOCsInputSchema,
    handler: async (ctx, input: SearchIOCsInput) =>
      toListResult(
        await s1Request(ctx, {
          action: 'searchIOCs',
          method: 'GET',
          path: '/threat-intelligence/iocs',
          params: input,
          mutating: false,
        })
      ),
  },

  createIOC: {
    isTool: true,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.createIOC,
    input: CreateIOCInputSchema,
    handler: async (ctx, input: CreateIOCInput) => {
      const { accountIds, siteIds, groupIds, tenant, ...indicator } = input;
      const filter = requireScope('createIOC', { accountIds, siteIds, groupIds, tenant });
      const body = await s1Request(ctx, {
        action: 'createIOC',
        method: 'POST',
        path: '/threat-intelligence/iocs',
        body: { data: [compact({ ...indicator, method: 'EQUALS' })], filter },
        mutating: true,
      });
      return assertApplied('createIOC', [indicator.value], body);
    },
  },

  deleteIOC: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.deleteIOC,
    input: DeleteIOCInputSchema,
    handler: async (ctx, input: DeleteIOCInput) => {
      const accountIds = requireIds(input.accountIds, 'deleteIOC needs the account id(s)');
      const uuids = requireIds(
        input.uuids,
        'uuids must list at least one indicator uuid (a scope-only filter would delete every indicator of the scope)'
      );
      const body = await s1Request(ctx, {
        action: 'deleteIOC',
        method: 'DELETE',
        path: '/threat-intelligence/iocs',
        body: { filter: compact({ accountIds, uuids, type: input.type }) },
        mutating: true,
      });
      return assertApplied('deleteIOC', uuids, body);
    },
  },

  listFirewallRules: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.listFirewallRules,
    input: ListFirewallRulesInputSchema,
    handler: async (ctx, input: ListFirewallRulesInput) => {
      const { name, actions, statuses, osTypes, accountIds, siteIds, groupIds, tenant } = input;
      const hasFilter =
        Boolean(name) ||
        [actions, statuses, osTypes, accountIds, siteIds, groupIds].some((list) => list?.length) ||
        tenant === true;
      if (!hasFilter) {
        throw new Error(
          'listFirewallRules needs at least one filter: name, actions, statuses, osTypes, accountIds, siteIds, groupIds or tenant = true'
        );
      }
      return toListResult(
        await s1Request(ctx, {
          action: 'listFirewallRules',
          method: 'GET',
          path: '/firewall-control',
          params: input,
          mutating: false,
        })
      );
    },
  },

  createFirewallRule: {
    isTool: true,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.createFirewallRule,
    input: CreateFirewallRuleInputSchema,
    handler: async (ctx, input: CreateFirewallRuleInput) => {
      const { accountIds, siteIds, groupIds, tenant, ...rule } = input;
      const filter = requireScope('createFirewallRule', { accountIds, siteIds, groupIds, tenant });
      return s1Request(ctx, {
        action: 'createFirewallRule',
        method: 'POST',
        path: '/firewall-control',
        body: { data: compact(rule), filter },
        mutating: true,
      });
    },
  },

  deleteFirewallRule: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.deleteFirewallRule,
    input: DeleteFirewallRuleInputSchema,
    handler: async (ctx, input: DeleteFirewallRuleInput) => {
      const ids = requireIds(input.ids, EMPTY_IDS);
      const body = await s1Request(ctx, {
        action: 'deleteFirewallRule',
        method: 'DELETE',
        path: '/firewall-control',
        body: { filter: { ids } },
        mutating: true,
      });
      return assertApplied('deleteFirewallRule', ids, body);
    },
  },
};
