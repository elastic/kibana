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
import type { ActionContext, ConnectorSpec, RelayActionClient } from '../../connector_spec';
import {
  ElasticSlackListChannelsInputSchema,
  ElasticSlackSendMessageInputSchema,
  type ElasticSlackChannel,
  type ElasticSlackSendMessageInput,
} from './types';

/**
 * Number of binding pages to walk when listing connected channels. The Relay pages at 200
 * entries, so this covers deployments with up to 2000 connected channels — far more than a
 * picker can usefully display — while bounding the work a single action can do.
 */
const MAX_BINDING_PAGES = 10;

interface RelayConnection {
  relay: RelayActionClient;
  tenantKey: string;
}

/**
 * The Relay client and tenant key are injected by the Actions plugin when the Elastic Slack
 * app is connected: the connector is registered dynamically at that point, with the workspace
 * tenant key as its config. Both are therefore expected to be present at execution time, and a
 * missing one means the connection was torn down between scheduling and execution.
 */
const getRelayConnection = (ctx: ActionContext): RelayConnection => {
  const { relay, config } = ctx;
  if (!relay) {
    throw new Error(
      i18n.translate('core.kibanaConnectorSpecs.elasticSlack.errors.relayNotConfigured', {
        defaultMessage: 'The Relay service is not configured on this deployment.',
      })
    );
  }

  const tenantKey = config?.tenantKey;
  if (typeof tenantKey !== 'string' || tenantKey.length === 0) {
    throw new Error(
      i18n.translate('core.kibanaConnectorSpecs.elasticSlack.errors.notConnected', {
        defaultMessage:
          'The Elastic Slack app is not connected. Reconnect it from the Significant Events settings.',
      })
    );
  }

  return { relay, tenantKey };
};

const listConnectedChannels = async (ctx: ActionContext): Promise<ElasticSlackChannel[]> => {
  const { relay, tenantKey } = getRelayConnection(ctx);

  const channels: ElasticSlackChannel[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_BINDING_PAGES; page++) {
    const { bindings, nextCursor } = await relay.listBindings(tenantKey, { cursor });

    for (const { scope_id: scopeId, display_name: displayName } of bindings) {
      if (scopeId) {
        channels.push({ id: scopeId, name: displayName ?? scopeId });
      }
    }

    if (!nextCursor) {
      return channels;
    }
    cursor = nextCursor;
  }

  ctx.log.warn(
    `Elastic Slack listChannels stopped after ${MAX_BINDING_PAGES} pages of Relay bindings`
  );
  return channels;
};

/**
 * Posts Slack messages through the Elastic Slack app rather than a workspace token: the
 * deployment installs the app once (Significant Events settings) and connects individual
 * channels, and this connector can then post to any of those connected channels. It holds no
 * credentials of its own — the Relay owns the Slack token and enforces that a deployment can
 * only reach the channels it has claimed.
 */
export const ElasticSlack: ConnectorSpec = {
  metadata: {
    id: '.elastic_slack',
    displayName: 'Slack (Elastic app)',
    description: i18n.translate('core.kibanaConnectorSpecs.elasticSlack.metadata.description', {
      defaultMessage:
        'Send messages to Slack channels connected to this deployment through the Elastic Slack app',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['alerting', 'workflows'],
    docsUrl: `https://www.elastic.co/docs/reference/kibana/connectors-kibana/elastic-slack-action-type`,
  },

  // The Relay authenticates this deployment at the transport layer (mTLS), so the connector
  // stores no credentials. `tenantKey` identifies the connected Slack workspace and is set by
  // the Actions plugin when the connector is registered — never entered by a user.
  schema: lazySchema(() =>
    z.object({
      tenantKey: z.string().min(1).meta({ hidden: true }),
    })
  ),

  actions: {
    listChannels: {
      isTool: true,
      description:
        'List the Slack channels connected to this deployment through the Elastic Slack app. Returns each channel id and display name. Use this to discover valid channel ids before sendMessage — messages to channels that are not connected are rejected.',
      input: ElasticSlackListChannelsInputSchema,
      handler: async (ctx) => {
        const channels = await listConnectedChannels(ctx);
        return { ok: true as const, channels };
      },
    },

    sendMessage: {
      isTool: true,
      description:
        'Send a message to a Slack channel connected to this deployment through the Elastic Slack app. Requires a connected channel id — use listChannels to discover them. Returns the Relay reference for the posted message, which can be used as threadTs to reply in a thread.',
      input: ElasticSlackSendMessageInputSchema,
      handler: async (ctx, input: ElasticSlackSendMessageInput) => {
        const { relay, tenantKey } = getRelayConnection(ctx);
        const { channel, text, threadTs } = input;

        ctx.log.debug(`Elastic Slack sendMessage request: channel=${channel}`);
        const { ref } = await relay.trigger({ tenantKey, channel, message: text, threadTs });

        return { ok: true as const, channel, ref };
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.elasticSlack.test.description', {
      defaultMessage: 'Verifies the Elastic Slack app connection by listing connected channels',
    }),
    handler: async (ctx) => {
      const channels = await listConnectedChannels(ctx);
      return {
        ok: true,
        message: i18n.translate('core.kibanaConnectorSpecs.elasticSlack.test.successMessage', {
          defaultMessage:
            'Connected to Slack through the Elastic app. {count, plural, one {# channel} other {# channels}} connected.',
          values: { count: channels.length },
        }),
      };
    },
  },

  skill: [
    'This connector can only post to channels that have been connected to this deployment through the Elastic Slack app. It cannot post to arbitrary Slack channels, and it cannot read messages, list users, or search — use the Slack (v2) connector for those.',
    'Always call listChannels first to get a valid channel id. sendMessage takes the channel id (e.g. C0123456789), never the channel name.',
    'To connect an additional channel, a user must invite @Elastic to it and connect it from the Significant Events settings in Kibana. There is no action here that can do that.',
    'The ref returned by sendMessage can be passed back as threadTs to reply in the same thread.',
  ].join('\n'),
};
