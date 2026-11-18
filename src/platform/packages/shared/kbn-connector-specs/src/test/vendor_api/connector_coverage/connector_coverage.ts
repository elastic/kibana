/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '../../../connector_spec';
import { connectorSpecHasEvents } from '../../../connector_spec_has_events';
import type { VendorApiManifest } from '../manifest';
import { isMarkdownFormat } from '../manifest';

export type CoverageDirection = 'outbound' | 'inbound' | 'both';

export type CoverageApiType =
  | 'openapi'
  | 'swagger'
  | 'discovery'
  | 'smithy'
  | 'markdown'
  | 'mcp'
  | 'database'
  | 'graphql'
  | 'jsonrpc'
  | 'generic'
  | 'self_hosted'
  | 'no_public_spec'
  | 'spec_mismatch'
  | 'not_an_api_client'
  | 'other'
  | 'unexplained';

/**
 * What stops the emulator from standing in for a connector in a Scout test, from #305216:
 * `no_vendor_spec` (no manifest, so nothing to serve), or the auth type's token request that the
 * emulator doesn't answer today. `none` means nothing stops it.
 */
export type EmulationBlocker =
  | 'none'
  | 'no_vendor_spec'
  | 'oauth_token_url_not_served'
  | 'oauth_token_url_user_set'
  | 'gcp_token_bypasses_proxy'
  | 'unchecked_auth';

/**
 * Whether the emulator answers the token request of the connector's OAuth auth types, in the
 * groups of #305216: `served` (the vendor spec declares the connector's token URL),
 * `token_url_not_served` (a fixed token URL no spec declares), `token_url_user_set` (the user
 * enters the token URL), and `no_vendor_spec` (nothing to serve at all). `not_oauth` for the rest.
 */
export type OauthEmulation =
  | 'not_oauth'
  | 'served'
  | 'token_url_not_served'
  | 'token_url_user_set'
  | 'no_vendor_spec';

/**
 * Where a connector can be used, from the `supportedFeatureIds` of its metadata: as a Workflows
 * step or trigger, and as an Agent Builder tool.
 */
export type Availability = 'both' | 'workflows_only' | 'agent_builder_only' | 'neither';

/**
 * Where the emulator's responses for a connector come from, from most to least realistic:
 * `recordings` captured from the vendor, `emulator_responses` (real-looking values committed in
 * `vendor_api/emulator_responses.json`, see #305093), hand-written `fixtures`, or `generated`
 * from the vendor spec's samples.
 */
export type MockResponses = 'recordings' | 'emulator_responses' | 'fixtures' | 'generated' | 'none';

export interface ConnectorCoverageDocument {
  readonly connector_id: string;
  readonly direction: CoverageDirection;
  readonly api_type: CoverageApiType;
  /** Every auth type the connector accepts, e.g. `bearer` or `oauth_authorization_code`. */
  readonly auth_methods: readonly string[];
  readonly auth_summary: string;
  /** The emulator can serve its API and its auth type's token request, so a Scout test can run. */
  readonly emulatable: boolean;
  readonly emulation_blocker: EmulationBlocker;
  /** The features the connector declares support for, e.g. `workflows` and `agentBuilder`. */
  readonly supported_features: readonly string[];
  readonly available_in_workflows: boolean;
  readonly available_in_agent_builder: boolean;
  readonly availability: Availability;
  /** The actions an agent may call as tools (`isTool`). */
  readonly tool_actions: number;
  readonly oauth_emulation: OauthEmulation;
  /** It has a committed vendor spec, so the weekly check can compare it with the latest one. */
  readonly drift_checkable: boolean;
  readonly mock_responses: MockResponses;
  /** Recorded or real-looking responses, rather than the spec's `"string"` samples. */
  readonly realistic_mocks: boolean;
  /** The connector's folder in the Kibana repository, for looking up its history. */
  readonly spec_directory: string;
  /** Whether the connector has `vendor_api` artifacts, so the emulator can serve it. */
  readonly emulated: boolean;
  /** `full` when the connector is recorded; `none` when it is exempt or not yet recorded. */
  readonly drift_protection: 'full' | 'none';
  readonly exemption_reason?: string;
}

const hasActions = (spec: ConnectorSpec): boolean => Object.keys(spec.actions).length > 0;

/** Inbound events and outbound actions both count; a spec with neither is reported as outbound. */
export const getDirection = (spec: ConnectorSpec): CoverageDirection => {
  const inbound = connectorSpecHasEvents(spec);
  if (inbound && hasActions(spec)) return 'both';
  return inbound ? 'inbound' : 'outbound';
};

/** Checked in order; the first match wins, so an MCP connector that also mentions a driver stays `mcp`. */
const EXEMPT_API_TYPE_RULES: ReadonlyArray<readonly [CoverageApiType, RegExp]> = [
  ['mcp', /\bMCP\b/],
  ['database', /\bdriver\b|\bTDS\b|\bdatabase\b/i],
  ['graphql', /GraphQL-only/i],
  ['jsonrpc', /JSON-RPC/i],
  ['not_an_api_client', /makes no outbound|sends no requests/i],
  ['generic', /^Generic connector/i],
  ['self_hosted', /\bself-hosted\b|\bon-premises\b/i],
  ['spec_mismatch', /\bdeprecated\b|needs to migrate/i],
  [
    'no_public_spec',
    /publishes (only|no)\b|\bno (static|public|publicly)\b|behind authentication/i,
  ],
];

/**
 * Stopgap until exemptions carry a category: reads the free-text reason. `other` means a reason
 * that no rule recognises; `unexplained` means the connector has no reason at all.
 */
export const getExemptApiType = (reason: string): CoverageApiType =>
  EXEMPT_API_TYPE_RULES.find(([, pattern]) => pattern.test(reason))?.[0] ?? 'other';

export interface AuthTypeFact {
  readonly type: string;
  readonly tokenUrl?: string;
}

/** What is read from a connector's folder and auth config, apart from its manifest. */
export interface ConnectorArtifactFacts {
  readonly authTypes: readonly AuthTypeFact[];
  /** Token URLs declared as an `oauth2` flow in the connector's committed vendor specs. */
  readonly servedTokenUrls: readonly string[];
  readonly hasFixtures: boolean;
  readonly hasRecordings: boolean;
  readonly hasEmulatorResponses: boolean;
  readonly specDirectory: string;
}

export const getAvailability = (
  spec: ConnectorSpec
): Pick<
  ConnectorCoverageDocument,
  | 'supported_features'
  | 'available_in_workflows'
  | 'available_in_agent_builder'
  | 'availability'
  | 'tool_actions'
> => {
  const features: readonly string[] = spec.metadata.supportedFeatureIds ?? [];
  const inWorkflows = features.includes('workflows');
  const inAgentBuilder = features.includes('agentBuilder');
  const availability: Availability = (() => {
    if (inWorkflows && inAgentBuilder) return 'both';
    if (inWorkflows) return 'workflows_only';
    return inAgentBuilder ? 'agent_builder_only' : 'neither';
  })();
  return {
    supported_features: features,
    available_in_workflows: inWorkflows,
    available_in_agent_builder: inAgentBuilder,
    availability,
    tool_actions: Object.values(spec.actions).filter((action) => action.isTool === true).length,
  };
};

/** The auth types of a spec, with the token URL it defaults to, when it has one. */
export const getAuthTypeFacts = (spec: ConnectorSpec): AuthTypeFact[] =>
  (spec.auth?.types ?? []).map((authType) => {
    if (typeof authType === 'string') return { type: authType };
    const { tokenUrl } = authType.defaults;
    return { type: authType.type, ...(typeof tokenUrl === 'string' ? { tokenUrl } : {}) };
  });

type AuthStatus = Exclude<EmulationBlocker, 'no_vendor_spec'> | 'oauth_served';

// Credentials the emulator needs nothing for: they are sent as they are, with no token request.
const STATIC_CREDENTIAL_AUTH_TYPES = new Set([
  'none',
  'bearer',
  'basic',
  'api_key_header',
  'api_key_query',
  'bearer_with_tls',
  'basic_with_tls',
  'api_key_header_with_tls',
]);

// Best first: a connector that accepts several auth types is as testable as its best one.
const AUTH_STATUS_ORDER: readonly AuthStatus[] = [
  'none',
  'oauth_served',
  'unchecked_auth',
  'gcp_token_bypasses_proxy',
  'oauth_token_url_not_served',
  'oauth_token_url_user_set',
];

const getAuthTypeStatus = (
  { type, tokenUrl }: AuthTypeFact,
  servedTokenUrls: readonly string[]
): AuthStatus => {
  if (STATIC_CREDENTIAL_AUTH_TYPES.has(type)) return 'none';
  if (type.startsWith('oauth_')) {
    if (!tokenUrl) return 'oauth_token_url_user_set';
    return servedTokenUrls.includes(tokenUrl) ? 'oauth_served' : 'oauth_token_url_not_served';
  }
  // The auth types #305216 verified or found broken, and the rest it didn't check (`ears`,
  // AWS signing, Kubernetes, Azure shared key, relay).
  return type === 'gcp_service_account' ? 'gcp_token_bypasses_proxy' : 'unchecked_auth';
};

export const getEmulationBlocker = ({
  emulated,
  facts: { authTypes, servedTokenUrls },
}: {
  emulated: boolean;
  facts: Pick<ConnectorArtifactFacts, 'authTypes' | 'servedTokenUrls'>;
}): EmulationBlocker => {
  if (!emulated) return 'no_vendor_spec';
  const [best] = authTypes
    .map((authType) => getAuthTypeStatus(authType, servedTokenUrls))
    .sort((a, b) => AUTH_STATUS_ORDER.indexOf(a) - AUTH_STATUS_ORDER.indexOf(b));
  return best === undefined || best === 'oauth_served' ? 'none' : best;
};

const OAUTH_EMULATION_ORDER: readonly OauthEmulation[] = [
  'served',
  'token_url_not_served',
  'token_url_user_set',
];

/** The best of the connector's OAuth auth types; one that accepts a plain token still counts. */
export const getOauthEmulation = ({
  emulated,
  facts: { authTypes, servedTokenUrls },
}: {
  emulated: boolean;
  facts: Pick<ConnectorArtifactFacts, 'authTypes' | 'servedTokenUrls'>;
}): OauthEmulation => {
  const oauthTypes = authTypes.filter(({ type }) => type.startsWith('oauth_'));
  if (oauthTypes.length === 0) return 'not_oauth';
  if (!emulated) return 'no_vendor_spec';
  const [best] = oauthTypes
    .map((authType) => getAuthTypeStatus(authType, servedTokenUrls))
    .map((status): OauthEmulation => {
      if (status === 'oauth_served') return 'served';
      return status === 'oauth_token_url_not_served'
        ? 'token_url_not_served'
        : 'token_url_user_set';
    })
    .sort((a, b) => OAUTH_EMULATION_ORDER.indexOf(a) - OAUTH_EMULATION_ORDER.indexOf(b));
  return best;
};

export const getMockResponses = ({
  emulated,
  hasFixtures,
  hasRecordings,
  hasEmulatorResponses,
}: Pick<ConnectorArtifactFacts, 'hasFixtures' | 'hasRecordings' | 'hasEmulatorResponses'> & {
  emulated: boolean;
}): MockResponses => {
  if (hasRecordings) return 'recordings';
  if (hasEmulatorResponses) return 'emulator_responses';
  if (hasFixtures) return 'fixtures';
  return emulated ? 'generated' : 'none';
};

/** The API type of a recorded connector: its sources' format, or the most used one if mixed. */
export const getRecordedApiType = (manifest: VendorApiManifest): CoverageApiType => {
  const counts = new Map<CoverageApiType, number>();
  for (const { format } of Object.values(manifest.sources)) {
    const type: CoverageApiType = isMarkdownFormat(format) ? 'markdown' : format;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  const [mostUsed] = [...counts.entries()].sort(([, a], [, b]) => b - a)[0] ?? [];
  return mostUsed ?? 'other';
};

export const buildCoverageDocument = ({
  spec,
  manifest,
  exemptionReason,
  facts,
}: {
  spec: ConnectorSpec;
  manifest?: VendorApiManifest;
  exemptionReason?: string;
  facts: ConnectorArtifactFacts;
}): ConnectorCoverageDocument => {
  const emulated = manifest !== undefined;
  const blocker = getEmulationBlocker({ emulated, facts });
  const authMethods = facts.authTypes.map(({ type }) => type);
  const base = {
    connector_id: spec.metadata.id,
    direction: getDirection(spec),
    auth_methods: authMethods,
    auth_summary: authMethods.join(', '),
    emulatable: blocker === 'none',
    emulation_blocker: blocker,
    ...getAvailability(spec),
    oauth_emulation: getOauthEmulation({ emulated, facts }),
    drift_checkable: emulated,
    mock_responses: getMockResponses({ emulated, ...facts }),
    realistic_mocks: facts.hasRecordings || facts.hasEmulatorResponses,
    spec_directory: facts.specDirectory,
  };
  if (manifest) {
    return {
      ...base,
      api_type: getRecordedApiType(manifest),
      emulated: true,
      drift_protection: 'full',
    };
  }
  return {
    ...base,
    api_type: exemptionReason ? getExemptApiType(exemptionReason) : 'unexplained',
    emulated: false,
    drift_protection: 'none',
    ...(exemptionReason ? { exemption_reason: exemptionReason } : {}),
  };
};
