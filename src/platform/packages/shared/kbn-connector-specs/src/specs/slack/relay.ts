/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { RELAY_AUTH_ID } from '../../auth_types/relay';
import type { ActionContext, ConnectorSpec, RelayActionClient } from '../../connector_spec';
import type { SlackListChannelsInput, SlackSendMessageInput } from './types';

/**
 * The Slack actions the Relay can serve. The Relay is not a Slack API proxy: it exposes an
 * outbound trigger for channels a deployment has connected, and the list of those connections.
 * Everything else in this spec talks to the Slack Web API with a workspace token, which a
 * relay-authenticated connector does not have.
 */
export const RELAY_SUPPORTED_ACTIONS = new Set(['sendMessage', 'listChannels']);

/**
 * Largest page the Relay's bindings endpoint accepts. `listChannels` shares its input schema with
 * the Slack Web API path, where the limit goes up to 1000 and defaults to it, so the requested
 * page size has to be capped before it reaches the Relay.
 */
const RELAY_MAX_BINDINGS_PAGE_SIZE = 200;

export interface SlackRelayConnection {
  relay: RelayActionClient;
  tenantKey: string;
}

const isRelayAuth = (ctx: ActionContext): boolean => ctx.secrets?.authType === RELAY_AUTH_ID;

/**
 * Resolve the Relay connection for a relay-authenticated connector, or `null` when the connector
 * authenticates with a Slack token and should use the Slack Web API instead.
 *
 * The Relay client and tenant key are both expected to be present once the Elastic Slack app is
 * connected — the connector is registered at that point with the workspace tenant key. A missing
 * one means the connection was torn down between scheduling and execution.
 */
export const getRelayConnection = (ctx: ActionContext): SlackRelayConnection | null => {
  if (!isRelayAuth(ctx)) {
    return null;
  }

  const { relay } = ctx;
  if (!relay) {
    throw new Error(
      i18n.translate('core.kibanaConnectorSpecs.slack.relay.errors.notConfigured', {
        defaultMessage: 'The Relay service is not configured on this deployment.',
      })
    );
  }

  const tenantKey = ctx.secrets?.tenantKey;
  if (typeof tenantKey !== 'string' || tenantKey.length === 0) {
    throw new Error(
      i18n.translate('core.kibanaConnectorSpecs.slack.relay.errors.notConnected', {
        defaultMessage:
          'The Elastic Slack app is not connected. Reconnect it from the Significant Events settings.',
      })
    );
  }

  return { relay, tenantKey };
};

/**
 * The Relay answers with an HTTP status the caller can act on, but its raw error text names an
 * internal endpoint. Restate the two cases a rule author can actually fix, and leave anything
 * else (5xx, network failures) to surface as-is.
 */
const rethrowRelayError = (error: unknown, channel: string): never => {
  const statusCode = (error as { statusCode?: unknown })?.statusCode;

  if (statusCode === 403) {
    throw new Error(
      i18n.translate('core.kibanaConnectorSpecs.slack.relay.errors.channelNotConnected', {
        defaultMessage:
          'Channel {channel} is not connected to this deployment. Invite @Elastic to it and connect it from the Significant Events settings.',
        values: { channel },
      })
    );
  }

  if (statusCode === 409) {
    throw new Error(
      i18n.translate('core.kibanaConnectorSpecs.slack.relay.errors.workspaceUninstalled', {
        defaultMessage:
          'The Elastic Slack app is no longer installed in this workspace. Reconnect it from the Significant Events settings.',
      })
    );
  }

  throw error;
};

/**
 * Post through the Relay, which resolves the deployment's binding from the tenant key and channel
 * id. The Relay's message reference is returned as `ts` so callers can thread on it exactly as
 * they would with a `chat.postMessage` timestamp.
 */
export const relaySendMessage = async (
  { relay, tenantKey }: SlackRelayConnection,
  ctx: ActionContext,
  input: SlackSendMessageInput
) => {
  const { channel, text, threadTs } = input;

  ctx.log.debug(`Slack sendMessage request through the Relay: channel=${channel}`);

  try {
    const { ref } = await relay.trigger({ tenantKey, channel, message: text, threadTs });
    return { ok: true as const, channel, ts: ref };
  } catch (error) {
    return rethrowRelayError(error, channel);
  }
};

/**
 * List the channels connected to this deployment, one Relay bindings page per call. The shape
 * matches what `listChannels` returns over the Slack Web API so channel pickers and workflows do
 * not have to care which auth method the connector uses.
 */
export const relayListChannels = async (
  { relay, tenantKey }: SlackRelayConnection,
  ctx: ActionContext,
  input: SlackListChannelsInput
) => {
  ctx.log.debug('Slack listChannels request through the Relay');

  const { bindings, nextCursor } = await relay.listBindings(tenantKey, {
    cursor: input.cursor,
    limit: Math.min(input.limit ?? RELAY_MAX_BINDINGS_PAGE_SIZE, RELAY_MAX_BINDINGS_PAGE_SIZE),
  });

  const channels = bindings
    .filter((binding) => Boolean(binding.scope_id))
    .map((binding) => ({
      id: binding.scope_id as string,
      name: binding.display_name ?? (binding.scope_id as string),
      is_private: binding.visibility === 'private',
      is_archived: false,
      is_member: true,
    }));

  return {
    ok: true as const,
    source: 'relay_bindings' as const,
    channels,
    nextCursor: nextCursor && nextCursor.length > 0 ? nextCursor : undefined,
    hasMore: Boolean(nextCursor && nextCursor.length > 0),
  };
};

/**
 * Fail every action the Relay cannot serve before it reaches the Slack Web API, where it would
 * otherwise fail with an opaque `invalid_auth`. Applied once around the whole action map so each
 * handler stays free of relay bookkeeping.
 */
export const withRelayGuards = (actions: ConnectorSpec['actions']): ConnectorSpec['actions'] =>
  Object.fromEntries(
    Object.entries(actions).map(([name, action]) => {
      if (RELAY_SUPPORTED_ACTIONS.has(name)) {
        return [name, action];
      }

      return [
        name,
        {
          ...action,
          handler: async (ctx: ActionContext, input: unknown) => {
            if (isRelayAuth(ctx)) {
              throw new Error(
                i18n.translate('core.kibanaConnectorSpecs.slack.relay.errors.actionNotSupported', {
                  defaultMessage:
                    '{action} is not available when this connector is authenticated through the Elastic Slack app. Only {supported} are supported, because the Elastic Slack app can only reach the channels connected to this deployment.',
                  values: {
                    action: name,
                    supported: [...RELAY_SUPPORTED_ACTIONS].join(' and '),
                  },
                })
              );
            }

            return action.handler(ctx, input);
          },
        },
      ];
    })
  );
