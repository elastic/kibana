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
import type { AxiosError } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import {
  NewRelicAcknowledgeIssueInputSchema,
  NewRelicUnacknowledgeIssueInputSchema,
  NewRelicResolveIssueInputSchema,
  NewRelicListIssuesInputSchema,
  NewRelicListIncidentsInputSchema,
  NewRelicCreateMutingRuleInputSchema,
  NewRelicUpdateMutingRuleInputSchema,
  NewRelicDeleteMutingRuleInputSchema,
  NewRelicListMutingRulesInputSchema,
  NewRelicRunNrqlQueryInputSchema,
  NewRelicCreateDeploymentMarkerInputSchema,
  NewRelicListAlertPoliciesInputSchema,
  NewRelicListNrqlConditionsInputSchema,
  NewRelicCreateAlertPolicyInputSchema,
  NewRelicCreateNrqlConditionInputSchema,
} from './types';
import type {
  NewRelicAcknowledgeIssueInput,
  NewRelicUnacknowledgeIssueInput,
  NewRelicResolveIssueInput,
  NewRelicListIssuesInput,
  NewRelicListIncidentsInput,
  NewRelicCreateMutingRuleInput,
  NewRelicUpdateMutingRuleInput,
  NewRelicDeleteMutingRuleInput,
  NewRelicRunNrqlQueryInput,
  NewRelicCreateDeploymentMarkerInput,
  NewRelicListAlertPoliciesInput,
  NewRelicListNrqlConditionsInput,
  NewRelicCreateAlertPolicyInput,
  NewRelicCreateNrqlConditionInput,
} from './types';

const REGION_ENDPOINTS: Record<string, string> = {
  us: 'https://api.newrelic.com/graphql',
  eu: 'https://api.eu.newrelic.com/graphql',
  jp: 'https://api.jp.newrelic.com/graphql',
};

interface GraphQlError {
  message: string;
  extensions?: { errorClass?: string };
}

interface GraphQlResponse<T> {
  data?: T;
  errors?: GraphQlError[];
}

const buildEndpoint = (ctx: ActionContext): string => {
  const region = ((ctx.config?.region as string | undefined) ?? 'us').toLowerCase();
  return REGION_ENDPOINTS[region] ?? REGION_ENDPOINTS.us;
};

const getAccountId = (ctx: ActionContext): number => {
  // Stored as a regex-validated string in config (see schema below) since the connector
  // config form has no numeric widget; NerdGraph's GraphQL variables need a real number.
  const raw = ctx.config?.accountId as string | number | undefined;
  const accountId = typeof raw === 'number' ? raw : Number(raw);
  if (!raw || Number.isNaN(accountId)) {
    throw new Error('New Relic connector is missing the required accountId configuration field.');
  }
  return accountId;
};

// NerdGraph returns `account: null` (with no top-level errors) when the API key
// cannot access the configured accountId. Guard before dereferencing so callers
// get a clear misconfiguration error instead of a TypeError.
const requireAccount = <T>(account: T | null | undefined, action: string, accountId: number): T => {
  if (account == null) {
    throw new Error(`New Relic ${action} failed: account ${accountId} not found or not accessible`);
  }
  return account;
};

async function graphqlRequest<T>(
  ctx: ActionContext,
  action: string,
  query: string,
  variables?: Record<string, unknown>,
  extraHeaders?: Record<string, string>
): Promise<T> {
  try {
    const response = await ctx.client.post<GraphQlResponse<T>>(
      buildEndpoint(ctx),
      { query, variables },
      { headers: extraHeaders }
    );
    if (response.data.errors?.length) {
      const message = response.data.errors.map((e) => e.message).join('; ');
      throw new Error(`New Relic ${action} failed: ${message}`);
    }
    if (!response.data.data) {
      throw new Error(`New Relic ${action} failed: empty response`);
    }
    return response.data.data;
  } catch (error) {
    if ((error as Error).message?.startsWith('New Relic')) {
      throw error;
    }
    const err = error as AxiosError<{ error?: { title?: string } }>;
    const detail = err.response?.data?.error?.title ?? err.message;
    throw new Error(
      `New Relic ${action} failed (status ${err.response?.status ?? 'unknown'}): ${detail}`
    );
  }
}

const AI_ISSUES_HEADERS = { 'nerd-graph-unsafe-experimental-opt-in': 'AiIssues' };

const toEpochMs = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// TimeWindowInput requires both startTime and endTime, so a since-only
// or until-only value must be completed with a default bound rather than sent
// partially (which NerdGraph would reject as a required-field error).
const buildTimeWindow = (
  since?: string,
  until?: string
): { startTime: number; endTime: number } | undefined => {
  const sinceMs = toEpochMs(since);
  const untilMs = toEpochMs(until);
  if (sinceMs === undefined && untilMs === undefined) return undefined;
  const endTime = untilMs ?? Date.now();
  const startTime = sinceMs ?? endTime - ONE_DAY_MS;
  return { startTime, endTime };
};

export const NewRelic: ConnectorSpec = {
  metadata: {
    id: '.new_relic',
    displayName: 'New Relic',
    description: i18n.translate('core.kibanaConnectorSpecs.newRelic.metadata.description', {
      defaultMessage:
        'Acknowledge and resolve New Relic AI issues, read issues and incidents, manage muting rules, and run NRQL queries over NerdGraph.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        isRecommended: true,
        defaults: { headerField: 'API-Key' },
        overrides: {
          meta: {
            'API-Key': {
              label: i18n.translate('core.kibanaConnectorSpecs.newRelic.auth.apiKey.label', {
                defaultMessage: 'User API Key',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.newRelic.auth.apiKey.helpText', {
                defaultMessage:
                  'A New Relic User API key (prefixed NRAK-). Create one under your user profile > API keys.',
              }),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      accountId: z
        .string()
        .min(1)
        .max(20)
        .regex(/^\d+$/, 'Must be a numeric New Relic account ID.')
        .describe('New Relic account ID this connector manages.')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.newRelic.config.accountId.label', {
            defaultMessage: 'Account ID',
          }),
          placeholder: '1234567',
          helpText: i18n.translate('core.kibanaConnectorSpecs.newRelic.config.accountId.helpText', {
            defaultMessage:
              'The numeric New Relic account ID this connector operates against. Found in the New Relic UI under your account name, or in account-scoped URLs as one.newrelic.com/accounts/ACCOUNT_ID. To manage another account, create a separate connector instance.',
          }),
        }),
      region: z
        .enum(['us', 'eu', 'jp'])
        .default('us')
        .describe('New Relic data center region for this account.')
        .meta({
          widget: 'select',
          label: i18n.translate('core.kibanaConnectorSpecs.newRelic.config.region.label', {
            defaultMessage: 'Region',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.newRelic.config.region.helpText', {
            defaultMessage:
              'The data center hosting your New Relic account: US (default), EU, or JP. Determines the NerdGraph endpoint used.',
          }),
        }),
    })
  ),

  actions: {
    acknowledgeIssue: {
      isTool: true,
      description:
        'Acknowledge a New Relic AI issue by ID via aiIssuesAckIssue, claiming it and stopping escalation churn. Use listIssues first to find the issueId.',
      input: NewRelicAcknowledgeIssueInputSchema,
      handler: async (ctx, input: NewRelicAcknowledgeIssueInput) => {
        const data = await graphqlRequest<{
          aiIssuesAckIssue: { error: string | null; result: Record<string, unknown> | null };
        }>(
          ctx,
          'acknowledgeIssue',
          `mutation($accountId: Int!, $issueId: ID!) {
            aiIssuesAckIssue(accountId: $accountId, issueId: $issueId) {
              error
              result { action accountId issueId }
            }
          }`,
          { accountId: getAccountId(ctx), issueId: input.issueId },
          AI_ISSUES_HEADERS
        );
        if (data.aiIssuesAckIssue.error) {
          throw new Error(`New Relic acknowledgeIssue failed: ${data.aiIssuesAckIssue.error}`);
        }
        return data.aiIssuesAckIssue.result ?? {};
      },
    },

    unacknowledgeIssue: {
      isTool: true,
      description:
        'Reverse the acknowledgment on a New Relic AI issue via aiIssuesUnackIssue, re-opening it for handoff or when remediation failed.',
      input: NewRelicUnacknowledgeIssueInputSchema,
      handler: async (ctx, input: NewRelicUnacknowledgeIssueInput) => {
        const data = await graphqlRequest<{
          aiIssuesUnackIssue: { error: string | null; result: Record<string, unknown> | null };
        }>(
          ctx,
          'unacknowledgeIssue',
          `mutation($accountId: Int!, $issueId: ID!) {
            aiIssuesUnackIssue(accountId: $accountId, issueId: $issueId) {
              error
              result { action accountId issueId }
            }
          }`,
          { accountId: getAccountId(ctx), issueId: input.issueId },
          AI_ISSUES_HEADERS
        );
        if (data.aiIssuesUnackIssue.error) {
          throw new Error(`New Relic unacknowledgeIssue failed: ${data.aiIssuesUnackIssue.error}`);
        }
        return data.aiIssuesUnackIssue.result ?? {};
      },
    },

    resolveIssue: {
      isTool: true,
      description:
        'Resolve and close a New Relic AI issue via aiIssuesResolveIssue. The terminal step of an auto-remediation workflow.',
      input: NewRelicResolveIssueInputSchema,
      handler: async (ctx, input: NewRelicResolveIssueInput) => {
        const data = await graphqlRequest<{
          aiIssuesResolveIssue: { error: string | null; result: Record<string, unknown> | null };
        }>(
          ctx,
          'resolveIssue',
          `mutation($accountId: Int!, $issueId: ID!) {
            aiIssuesResolveIssue(accountId: $accountId, issueId: $issueId) {
              error
              result { action accountId issueId }
            }
          }`,
          { accountId: getAccountId(ctx), issueId: input.issueId },
          AI_ISSUES_HEADERS
        );
        if (data.aiIssuesResolveIssue.error) {
          throw new Error(`New Relic resolveIssue failed: ${data.aiIssuesResolveIssue.error}`);
        }
        return data.aiIssuesResolveIssue.result ?? {};
      },
    },

    listIssues: {
      isTool: true,
      description:
        'List New Relic AI issues (deduplicated, correlated groups of incidents) for an account, filterable by state, priority, entity GUIDs, and time window. Defaults to the last 24 hours if no window is given. Drives triage and enrichment branching in a workflow. Returns nextCursor for pagination.',
      input: NewRelicListIssuesInputSchema,
      handler: async (ctx, input: NewRelicListIssuesInput) => {
        const accountId = getAccountId(ctx);
        const filter: Record<string, unknown> = {};
        if (input.states) filter.states = input.states;
        if (input.priority) filter.priority = input.priority;
        if (input.entityGuids) filter.entityGuids = input.entityGuids;
        const timeWindow = buildTimeWindow(input.since, input.until);
        const data = await graphqlRequest<{
          actor: {
            account: {
              aiIssues: {
                issues: {
                  issues: Array<Record<string, unknown>>;
                  nextCursor: string | null;
                };
              };
            } | null;
          };
        }>(
          ctx,
          'listIssues',
          `query($accountId: Int!, $filter: AiIssuesFilterIssues, $timeWindow: TimeWindowInput, $cursor: String) {
            actor {
              account(id: $accountId) {
                aiIssues {
                  issues(filter: $filter, timeWindow: $timeWindow, cursor: $cursor) {
                    issues {
                      issueId
                      title
                      priority
                      state
                      sources
                      entityGuids
                      entityNames
                      entityTypes
                      acknowledgedAt
                      acknowledgedBy
                      createdAt
                      activatedAt
                      closedAt
                      updatedAt
                      totalIncidents
                      policyName
                      conditionName
                    }
                    nextCursor
                  }
                }
              }
            }
          }`,
          {
            accountId,
            filter: Object.keys(filter).length ? filter : undefined,
            timeWindow,
            cursor: input.cursor,
          },
          AI_ISSUES_HEADERS
        );
        return requireAccount(data.actor.account, 'listIssues', accountId).aiIssues.issues;
      },
    },

    listIncidents: {
      isTool: true,
      description:
        'List the individual New Relic incidents (condition violations) grouped under AI issues for an account, filterable by state, priority, entity GUIDs, and time window. Use for granular per-signal handling. Returns nextCursor for pagination.',
      input: NewRelicListIncidentsInputSchema,
      handler: async (ctx, input: NewRelicListIncidentsInput) => {
        const accountId = getAccountId(ctx);
        const filter: Record<string, unknown> = {};
        if (input.states) filter.states = input.states;
        if (input.priority) filter.priority = input.priority;
        if (input.entityGuids) filter.entityGuids = input.entityGuids;
        const timeWindow = buildTimeWindow(input.since, input.until);
        const data = await graphqlRequest<{
          actor: {
            account: {
              aiIssues: {
                incidents: {
                  incidents: Array<Record<string, unknown>>;
                  nextCursor: string | null;
                };
              };
            } | null;
          };
        }>(
          ctx,
          'listIncidents',
          `query($accountId: Int!, $filter: AiIssuesFilterIncidents, $timeWindow: TimeWindowInput, $cursor: String) {
            actor {
              account(id: $accountId) {
                aiIssues {
                  incidents(filter: $filter, timeWindow: $timeWindow, cursor: $cursor) {
                    incidents {
                      incidentId
                      title
                      description
                      priority
                      state
                      entityGuids
                      entityNames
                      createdAt
                      updatedAt
                      closedAt
                    }
                    nextCursor
                  }
                }
              }
            }
          }`,
          {
            accountId,
            filter: Object.keys(filter).length ? filter : undefined,
            timeWindow,
            cursor: input.cursor,
          },
          AI_ISSUES_HEADERS
        );
        return requireAccount(data.actor.account, 'listIncidents', accountId).aiIssues.incidents;
      },
    },

    createMutingRule: {
      isTool: true,
      description:
        'Create a New Relic muting rule via alertsMutingRuleCreate to suppress alert notifications matching a condition, e.g. during a deploy or maintenance window. The core noise-control action.',
      input: NewRelicCreateMutingRuleInputSchema,
      handler: async (ctx, input: NewRelicCreateMutingRuleInput) => {
        const data = await graphqlRequest<{ alertsMutingRuleCreate: Record<string, unknown> }>(
          ctx,
          'createMutingRule',
          `mutation($accountId: Int!, $rule: AlertsMutingRuleInput!) {
            alertsMutingRuleCreate(accountId: $accountId, rule: $rule) {
              id
              name
              description
              enabled
              accountId
              condition { operator conditions { attribute operator values } }
            }
          }`,
          {
            accountId: getAccountId(ctx),
            rule: {
              name: input.name,
              description: input.description,
              enabled: input.enabled,
              condition: input.condition,
            },
          }
        );
        return data.alertsMutingRuleCreate;
      },
    },

    updateMutingRule: {
      isTool: true,
      description:
        'Update an existing New Relic muting rule via alertsMutingRuleUpdate, e.g. to extend a maintenance window, without deleting and recreating it.',
      input: NewRelicUpdateMutingRuleInputSchema,
      handler: async (ctx, input: NewRelicUpdateMutingRuleInput) => {
        const rule: Record<string, unknown> = {};
        if (input.name !== undefined) rule.name = input.name;
        if (input.description !== undefined) rule.description = input.description;
        if (input.enabled !== undefined) rule.enabled = input.enabled;
        if (input.condition !== undefined) rule.condition = input.condition;
        const data = await graphqlRequest<{ alertsMutingRuleUpdate: Record<string, unknown> }>(
          ctx,
          'updateMutingRule',
          `mutation($accountId: Int!, $id: ID!, $rule: AlertsMutingRuleUpdateInput!) {
            alertsMutingRuleUpdate(accountId: $accountId, id: $id, rule: $rule) {
              id
              name
              description
              enabled
              condition { operator conditions { attribute operator values } }
            }
          }`,
          { accountId: getAccountId(ctx), id: input.mutingRuleId, rule }
        );
        return data.alertsMutingRuleUpdate;
      },
    },

    deleteMutingRule: {
      isTool: true,
      description:
        'Delete a New Relic muting rule via alertsMutingRuleDelete so alerting resumes when the suppression window closes. Pairs with createMutingRule.',
      input: NewRelicDeleteMutingRuleInputSchema,
      handler: async (ctx, input: NewRelicDeleteMutingRuleInput) => {
        const data = await graphqlRequest<{ alertsMutingRuleDelete: { id: string } }>(
          ctx,
          'deleteMutingRule',
          `mutation($accountId: Int!, $id: ID!) {
            alertsMutingRuleDelete(accountId: $accountId, id: $id) { id }
          }`,
          { accountId: getAccountId(ctx), id: input.mutingRuleId }
        );
        return data.alertsMutingRuleDelete;
      },
    },

    listMutingRules: {
      isTool: true,
      description:
        'List existing New Relic muting rules for an account, so a workflow can check for an existing rule before creating or deleting one (idempotency).',
      input: NewRelicListMutingRulesInputSchema,
      handler: async (ctx) => {
        const accountId = getAccountId(ctx);
        const data = await graphqlRequest<{
          actor: {
            account: { alerts: { mutingRules: Array<Record<string, unknown>> } } | null;
          };
        }>(
          ctx,
          'listMutingRules',
          `query($accountId: Int!) {
            actor {
              account(id: $accountId) {
                alerts {
                  mutingRules {
                    id
                    name
                    description
                    enabled
                    condition { operator conditions { attribute operator values } }
                  }
                }
              }
            }
          }`,
          { accountId }
        );
        return {
          mutingRules: requireAccount(data.actor.account, 'listMutingRules', accountId).alerts
            .mutingRules,
        };
      },
    },

    runNrqlQuery: {
      isTool: true,
      description:
        'Run an NRQL query against a New Relic account and return the results. The primary read path for metric, event-count, and health-check enrichment inside a workflow, e.g. "SELECT count(*) FROM Transaction SINCE 1 HOUR AGO".',
      input: NewRelicRunNrqlQueryInputSchema,
      handler: async (ctx, input: NewRelicRunNrqlQueryInput) => {
        const accountId = getAccountId(ctx);
        const data = await graphqlRequest<{
          actor: {
            account: {
              nrql: { results: Array<Record<string, unknown>>; metadata?: unknown };
            } | null;
          };
        }>(
          ctx,
          'runNrqlQuery',
          `query($accountId: Int!, $nrql: Nrql!, $timeout: Seconds) {
            actor {
              account(id: $accountId) {
                nrql(query: $nrql, timeout: $timeout) {
                  results
                  metadata { eventTypes facets messages }
                }
              }
            }
          }`,
          { accountId, nrql: input.nrql, timeout: input.timeoutSeconds ?? 70 }
        );
        return requireAccount(data.actor.account, 'runNrqlQuery', accountId).nrql;
      },
    },

    createDeploymentMarker: {
      isTool: true,
      description:
        'Record a deployment/change marker on a New Relic entity via changeTrackingCreateEvent, so alerts and dashboards correlate to the deploy. Closes the CI/CD-to-observability loop.',
      input: NewRelicCreateDeploymentMarkerInputSchema,
      handler: async (ctx, input: NewRelicCreateDeploymentMarkerInput) => {
        const data = await graphqlRequest<{
          changeTrackingCreateEvent: {
            changeTrackingEvent: { changeTrackingId: string } | null;
            messages: string[] | null;
          };
        }>(
          ctx,
          'createDeploymentMarker',
          `mutation($event: ChangeTrackingCreateEventInput!) {
            changeTrackingCreateEvent(changeTrackingEvent: $event) {
              changeTrackingEvent { changeTrackingId }
              messages
            }
          }`,
          {
            event: {
              categoryAndTypeData: {
                kind: { category: 'deployment', type: input.deploymentType ?? 'Basic' },
                categoryFields: {
                  deployment: {
                    version: input.version,
                  },
                },
              },
              entitySearch: { query: `id = '${input.entityGuid}'` },
              description: input.description,
              user: input.user,
              groupId: input.groupId,
              timestamp: toEpochMs(input.timestamp),
            },
          }
        );
        return data.changeTrackingCreateEvent;
      },
    },

    listAlertPolicies: {
      isTool: true,
      description:
        'List New Relic alert policies for an account, optionally filtered by a name substring, to resolve policy context or target a muting rule or condition action.',
      input: NewRelicListAlertPoliciesInputSchema,
      handler: async (ctx, input: NewRelicListAlertPoliciesInput) => {
        const accountId = getAccountId(ctx);
        const data = await graphqlRequest<{
          actor: {
            account: {
              alerts: {
                policiesSearch: {
                  policies: Array<Record<string, unknown>>;
                  nextCursor: string | null;
                };
              };
            } | null;
          };
        }>(
          ctx,
          'listAlertPolicies',
          `query($accountId: Int!, $searchCriteria: AlertsPoliciesSearchCriteriaInput, $cursor: String) {
            actor {
              account(id: $accountId) {
                alerts {
                  policiesSearch(searchCriteria: $searchCriteria, cursor: $cursor) {
                    policies { id name incidentPreference accountId }
                    nextCursor
                  }
                }
              }
            }
          }`,
          {
            accountId,
            searchCriteria: input.nameFilter ? { nameLike: input.nameFilter } : undefined,
            cursor: input.cursor,
          }
        );
        return requireAccount(data.actor.account, 'listAlertPolicies', accountId).alerts
          .policiesSearch;
      },
    },

    listNrqlConditions: {
      isTool: true,
      description:
        'List the NRQL alert conditions under a New Relic alert policy, to audit existing conditions or pick one to reference.',
      input: NewRelicListNrqlConditionsInputSchema,
      handler: async (ctx, input: NewRelicListNrqlConditionsInput) => {
        const accountId = getAccountId(ctx);
        const data = await graphqlRequest<{
          actor: {
            account: {
              alerts: {
                nrqlConditionsSearch: { nrqlConditions: Array<Record<string, unknown>> };
              };
            } | null;
          };
        }>(
          ctx,
          'listNrqlConditions',
          `query($accountId: Int!, $searchCriteria: AlertsNrqlConditionsSearchCriteriaInput) {
            actor {
              account(id: $accountId) {
                alerts {
                  nrqlConditionsSearch(searchCriteria: $searchCriteria) {
                    nrqlConditions {
                      id
                      name
                      enabled
                      policyId
                      nrql { query }
                      type
                    }
                  }
                }
              }
            }
          }`,
          { accountId, searchCriteria: { policyId: input.policyId } }
        );
        return {
          nrqlConditions: requireAccount(data.actor.account, 'listNrqlConditions', accountId).alerts
            .nrqlConditionsSearch.nrqlConditions,
        };
      },
    },

    createAlertPolicy: {
      isTool: true,
      description:
        'Provision a new New Relic alert policy via alertsPolicyCreate, for as-code alerting setup from a workflow.',
      input: NewRelicCreateAlertPolicyInputSchema,
      handler: async (ctx, input: NewRelicCreateAlertPolicyInput) => {
        const data = await graphqlRequest<{ alertsPolicyCreate: Record<string, unknown> }>(
          ctx,
          'createAlertPolicy',
          `mutation($accountId: Int!, $policy: AlertsPolicyInput!) {
            alertsPolicyCreate(accountId: $accountId, policy: $policy) {
              id
              name
              incidentPreference
            }
          }`,
          {
            accountId: getAccountId(ctx),
            policy: {
              name: input.name,
              incidentPreference: input.incidentPreference ?? 'PER_POLICY',
            },
          }
        );
        return data.alertsPolicyCreate;
      },
    },

    createNrqlCondition: {
      isTool: true,
      description:
        'Create a static NRQL alert condition under a New Relic alert policy via alertsNrqlConditionStaticCreate, completing the as-code condition path.',
      input: NewRelicCreateNrqlConditionInputSchema,
      handler: async (ctx, input: NewRelicCreateNrqlConditionInput) => {
        const data = await graphqlRequest<{
          alertsNrqlConditionStaticCreate: Record<string, unknown>;
        }>(
          ctx,
          'createNrqlCondition',
          `mutation($accountId: Int!, $policyId: ID!, $condition: AlertsNrqlConditionStaticInput!) {
            alertsNrqlConditionStaticCreate(accountId: $accountId, policyId: $policyId, condition: $condition) {
              id
              name
              enabled
              nrql { query }
            }
          }`,
          {
            accountId: getAccountId(ctx),
            policyId: input.policyId,
            condition: {
              name: input.name,
              enabled: input.enabled,
              nrql: { query: input.nrql },
              terms: [
                {
                  operator: input.thresholdOperator,
                  threshold: input.thresholdValue,
                  thresholdDuration: input.thresholdDurationSeconds,
                  thresholdOccurrences: 'ALL',
                  priority: 'CRITICAL',
                },
              ],
              valueFunction: 'SINGLE_VALUE',
            },
          }
        );
        return data.alertsNrqlConditionStaticCreate;
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.newRelic.test.description', {
      defaultMessage: 'Verifies connectivity by requesting the current NerdGraph user context.',
    }),
    handler: async (ctx) => {
      const data = await graphqlRequest<{ actor: { user: { name: string; email: string } } }>(
        ctx,
        'test',
        `{ actor { user { name email } } }`
      );
      return {
        message: `Connected to New Relic NerdGraph as ${data.actor.user.name} (${data.actor.user.email}).`,
      };
    },
  },

  skill: [
    '## New Relic Connector Usage Guide',
    '',
    'This connector wraps New Relic NerdGraph (GraphQL) and is scoped to a single New Relic account, configured once on the connector as `accountId`. To manage a different account, create a separate connector instance.',
    '',
    '### Issue Triage Flow',
    '',
    '1. Call `listIssues` with an optional `states`/`priority` filter to find open AI issues.',
    '2. Call `acknowledgeIssue` with the `issueId` to claim it and stop escalation.',
    '3. Use `runNrqlQuery` or `listIncidents` to enrich and investigate.',
    '4. Call `resolveIssue` once remediated, or `unacknowledgeIssue` to hand it back off.',
    '',
    '### Noise Control',
    '',
    'Before a deploy or maintenance window, call `listMutingRules` to check for an existing rule, then `createMutingRule` scoped by `policyId`, `conditionId`, or `entity.guid` attributes.',
    'Call `deleteMutingRule` once the window closes, or `updateMutingRule` to extend it.',
    '',
    '### As-Code Alerting',
    '',
    'Use `listAlertPolicies` and `listNrqlConditions` to audit existing setup, and `createAlertPolicy` / `createNrqlCondition` to provision new ones.',
  ].join('\n'),
};
