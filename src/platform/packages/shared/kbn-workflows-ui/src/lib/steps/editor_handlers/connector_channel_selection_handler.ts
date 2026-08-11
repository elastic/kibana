/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { PropertySelectionHandler, SelectionOption } from '@kbn/workflows/types/latest';

export interface ConnectorChannelSelectionHandlerServices {
  http: HttpStart;
}

export interface ConnectorChannelSelectionHandlerOptions {
  /** Sub-action to execute; must return `{ ok: true, channels: [{ id, name }] }`. */
  subAction: string;
  /** Maximum number of options to offer. Defaults to 20. */
  maxResults?: number;
}

interface Channel {
  id: string;
  name: string;
}

interface ExecuteResponse {
  status: string;
  data?: { ok?: boolean; channels?: Channel[] };
}

const DEFAULT_MAX_RESULTS = 20;

/**
 * The step's `connector-id` is a sibling root-level property, so the handler must declare it as
 * a dependency to receive it in `context.values.config`.
 */
const DEPENDS_ON_CONNECTOR_ID = ['config.connector-id'] as const;

const toSelectionOption = ({ id, name }: Channel): SelectionOption<string> => ({
  value: id,
  label: `#${name}`,
  description: i18n.translate('workflows.connectorChannelSelection.channelDescription', {
    defaultMessage: 'Channel #{name}',
    values: { name },
  }),
});

/**
 * Suggests the channels a connector instance can post to, by executing a channel-listing
 * sub-action on that instance. The stored value is the channel *id*, since that is what the
 * corresponding `sendMessage` action resolves against.
 *
 * Requires a `connector-id` on the step: without one there is no instance to ask, so the
 * handler returns no suggestions rather than guessing.
 */
export const getConnectorChannelSelectionHandler = (
  { http }: ConnectorChannelSelectionHandlerServices,
  { subAction, maxResults = DEFAULT_MAX_RESULTS }: ConnectorChannelSelectionHandlerOptions
): PropertySelectionHandler<string> => {
  const listChannels = async (connectorId: string): Promise<Channel[]> => {
    try {
      const response = await http.post<ExecuteResponse>(
        `/api/actions/connector/${encodeURIComponent(connectorId)}/_execute`,
        { body: JSON.stringify({ params: { subAction, subActionParams: {} } }) }
      );

      if (response.status !== 'ok' || !response.data?.ok) {
        return [];
      }
      return response.data.channels ?? [];
    } catch {
      return [];
    }
  };

  const getConnectorId = (context: {
    values: { config: Record<string, unknown> };
  }): string | undefined => {
    const connectorId = context.values.config['connector-id'];
    return typeof connectorId === 'string' && connectorId.length > 0 ? connectorId : undefined;
  };

  return {
    dependsOnValues: [...DEPENDS_ON_CONNECTOR_ID],

    search: async (rawInput, context) => {
      const connectorId = getConnectorId(context);
      if (!connectorId) {
        return [];
      }

      const query = rawInput.trim().toLowerCase();
      const channels = await listChannels(connectorId);

      return channels
        .filter(({ id, name }) =>
          query ? name.toLowerCase().includes(query) || id.toLowerCase().includes(query) : true
        )
        .slice(0, maxResults)
        .map(toSelectionOption);
    },

    resolve: async (value, context) => {
      const connectorId = getConnectorId(context);
      if (!connectorId || !value) {
        return null;
      }

      const channels = await listChannels(connectorId);
      const match = channels.find(({ id }) => id === value);
      return match ? toSelectionOption(match) : null;
    },

    getDetails: async (input, _context, option) => {
      if (option) {
        return {
          message: i18n.translate('workflows.connectorChannelSelection.detailsFound', {
            defaultMessage: '✓ {label} is connected and can receive messages.',
            values: { label: option.label ?? input },
          }),
          links: [],
        };
      }

      return {
        message: i18n.translate('workflows.connectorChannelSelection.detailsNotFound', {
          defaultMessage:
            '`{input}` is not a connected channel. Messages to channels that are not connected are rejected at run time.',
          values: { input },
        }),
        links: [],
      };
    },
  };
};
