/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RELAY_AUTH_ID } from '../../auth_types/relay';
import type { ActionContext } from '../../connector_spec';
import type { RelayActionClient } from '../../relay_action_client';
import type {
  SlackGetConversationHistoryInput,
  SlackListChannelsInput,
  SlackResolveChannelIdInput,
  SlackSendMessageInput,
  SlackUpdateMessageInput,
} from './types';

const getRelaySupportedActions = () => Object.keys(slackRelay.actions);

/** The Relay's own max page size; the Slack schemas allow far larger limits. */
const RELAY_MAX_BINDINGS_PAGE = 200;

/** Marks results as coming from the connected bindings rather than a `conversations.list` call. */
const RELAY_CHANNEL_SOURCE = 'relay-bindings' as const;

const createChannelNotConnectedError = (channel: string): Error =>
  new Error(`Channel ${channel} is not connected. Connect it in the Elastic Slack app settings.`);

export type SlackRelayClient = Omit<RelayActionClient, 'trigger'> & {
  trigger(
    input: Parameters<RelayActionClient['trigger']>[0] & {
      blocks?: Array<Record<string, unknown>>;
    }
  ): ReturnType<RelayActionClient['trigger']>;
};

export interface SlackRelayConnection {
  client: SlackRelayClient;
  tenantKey: string;
}

const isRelayAuth = (ctx: ActionContext): boolean =>
  (ctx.secrets as { authType?: string } | undefined)?.authType === RELAY_AUTH_ID;

/**
 * The Relay connection for this execution, or `null` when the connector holds its own Slack token.
 *
 * Throws rather than falling back to `ctx.client`: a relay connector has no token, so a direct call
 * would fail with an opaque `invalid_auth` well after the reason was knowable.
 */
export function getRelayConnection(ctx: ActionContext): SlackRelayConnection | null {
  if (!isRelayAuth(ctx)) {
    return null;
  }

  if (!ctx.relay) {
    throw new Error('This connector uses the Elastic Slack app, which is not configured.');
  }

  const tenantKey = (ctx.secrets as { tenantKey?: string } | undefined)?.tenantKey;
  if (!tenantKey) {
    throw new Error(
      'This connector is not linked to a Slack workspace. Reconnect the Elastic Slack app.'
    );
  }

  return { client: ctx.relay, tenantKey };
}

const getStatusCode = (error: unknown): number | undefined => {
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof statusCode === 'number' ? statusCode : undefined;
};

/**
 * Restates the Relay failures a rule author can act on. Status is enough: 403 is "not connected"
 * whether the name was unbound or the walk ran out, 409 is uninstalled, 429 is throttled.
 */
function toUserFacingError(error: unknown, channel?: string): unknown {
  switch (getStatusCode(error)) {
    case 403:
      return channel
        ? createChannelNotConnectedError(channel)
        : new Error('Not allowed to read the connected channels. Reconnect the Elastic Slack app.');
    case 409:
      return new Error(
        'The Elastic Slack app is no longer installed in this workspace. Reconnect it.'
      );
    case 429:
      return new Error('Slack rate-limited this request. Try again shortly.');
    default:
      return error;
  }
}

/** Posts through the Relay, returning the timestamp as `ts` and `timestamp` so callers can thread on either. */
export async function relaySendMessage(
  connection: SlackRelayConnection,
  ctx: ActionContext,
  input: SlackSendMessageInput
): Promise<{
  ok: true;
  channel: string;
  ts: string;
  timestamp: string;
  externalConversationId?: string;
}> {
  if (input.unfurlLinks !== undefined || input.unfurlMedia !== undefined) {
    ctx.log.debug(
      'Slack sendMessage: unfurl options are not supported through the Elastic Slack app and were ignored'
    );
  }

  const channel = input.channel.trim();
  if (channel.length === 0 || channel === '#') {
    throw new Error('Channel is required.');
  }

  ctx.log.debug(`Slack sendMessage request through relay: channel=${channel}`);

  try {
    const {
      ref,
      channel: resolvedChannel,
      externalConversationId,
    } = await connection.client.trigger({
      tenantKey: connection.tenantKey,
      channel,
      message: input.text,
      ...(input.blocks?.length ? { blocks: input.blocks } : {}),
      ...(input.threadTs ? { threadTs: input.threadTs } : {}),
    });

    return {
      ok: true,
      channel: resolvedChannel,
      ts: ref,
      timestamp: ref,
      ...(externalConversationId ? { externalConversationId } : {}),
    };
  } catch (error) {
    ctx.log.error(`Slack sendMessage through relay failed: ${(error as Error).message}`);
    throw toUserFacingError(error, channel);
  }
}

/** Edits a message this app posted through the Relay, returning its timestamp as `ts`. */
export async function relayUpdateMessage(
  connection: SlackRelayConnection,
  ctx: ActionContext,
  input: SlackUpdateMessageInput
): Promise<{ ok: true; channel: string; ts: string }> {
  const channel = input.channel.trim();
  if (channel.length === 0 || channel === '#') {
    throw new Error('Channel is required.');
  }

  ctx.log.debug(`Slack updateMessage request through relay: channel=${channel}`);

  try {
    const { ref, channel: resolvedChannel } = await connection.client.trigger({
      tenantKey: connection.tenantKey,
      channel,
      message: input.text,
      ...(input.blocks?.length ? { blocks: input.blocks } : {}),
      messageTs: input.messageTs,
    });

    return { ok: true, channel: resolvedChannel, ts: ref };
  } catch (error) {
    ctx.log.error(`Slack updateMessage through relay failed: ${(error as Error).message}`);
    throw toUserFacingError(error, channel);
  }
}

/** Shaped like a `conversations.list` entry, so callers need no relay branch. */
interface RelayChannel {
  id: string;
  name: string;
  is_private: boolean;
}

type RelayBindings = Awaited<ReturnType<RelayActionClient['listBindings']>>['bindings'];

const toChannels = (bindings: RelayBindings): RelayChannel[] =>
  bindings.flatMap(({ scope_id: id, display_name: displayName, visibility }) =>
    id
      ? [
          {
            id,
            // Bindings predating the Relay's display snapshots carry no name, and an unlabeled
            // entry in a channel picker is worse than one reading `C0123456789`.
            name: displayName ?? id,
            is_private: visibility === 'private',
          },
        ]
      : []
  );

const fetchBindingsPage = async (
  { client, tenantKey }: SlackRelayConnection,
  ctx: ActionContext,
  { cursor, limit }: { cursor?: string; limit: number }
) => {
  try {
    return await client.listBindings(tenantKey, {
      limit: Math.min(limit, RELAY_MAX_BINDINGS_PAGE),
      ...(cursor ? { cursor } : {}),
    });
  } catch (error) {
    ctx.log.error(`Slack bindings lookup through relay failed: ${(error as Error).message}`);
    throw toUserFacingError(error);
  }
};

/**
 * Lists the channels connected to the Elastic Slack app rather than the whole workspace — the only
 * ones this connector could post to anyway.
 *
 * `types` and `excludeArchived` are ignored: the bindings are already an admin-built allow-list, and
 * the schema's `public_channel`-only default would drop every connected private channel from callers
 * that pass no input at all, such as the alerting rule form's channel selector.
 */
export async function relayListChannels(
  connection: SlackRelayConnection,
  ctx: ActionContext,
  input: SlackListChannelsInput
) {
  ctx.log.debug('Slack listChannels request through relay');

  const page = await fetchBindingsPage(connection, ctx, {
    cursor: input.cursor,
    limit: input.limit,
  });

  // `raw` is ignored: there is no Slack API body to pass through.
  return {
    ok: true as const,
    source: RELAY_CHANNEL_SOURCE,
    channels: toChannels(page.bindings),
    nextCursor: page.nextCursor,
    hasMore: Boolean(page.nextCursor),
  };
}

/** Resolves a name against the connected channels only. */
export async function relayResolveChannelId(
  connection: SlackRelayConnection,
  ctx: ActionContext,
  input: SlackResolveChannelIdInput
) {
  const nameNorm = input.name.trim().replace(/^#/, '').toLowerCase();

  let cursor = input.cursor;
  let pagesFetched = 0;

  while (pagesFetched < input.maxPages) {
    ctx.log.debug(`Slack connected-channel scan through relay (page ${pagesFetched + 1})`);
    const page = await fetchBindingsPage(connection, ctx, { cursor, limit: input.limit });

    const found = toChannels(page.bindings).find(({ name }) => {
      const candidate = name.toLowerCase();
      return input.match === 'exact' ? candidate === nameNorm : candidate.includes(nameNorm);
    });

    pagesFetched += 1;

    if (found) {
      return {
        ok: true,
        found: true as const,
        id: found.id,
        name: found.name,
        source: RELAY_CHANNEL_SOURCE,
        pagesFetched,
        nextCursor: page.nextCursor,
      };
    }

    if (!page.nextCursor) {
      cursor = undefined;
      break;
    }
    cursor = page.nextCursor;
  }

  return {
    ok: true,
    found: false as const,
    id: undefined,
    name: nameNorm,
    source: RELAY_CHANNEL_SOURCE,
    pagesFetched,
    nextCursor: cursor,
  };
}

const SLACK_CONVERSATION_ID = /^[CGD][A-Z0-9]+$/;

// A Slack ts or whole epoch seconds:
// https://docs.slack.dev/reference/methods/conversations.history#arguments
const SLACK_WINDOW_BOUND = /^\d{1,12}(\.\d{1,6})?$/;

const RELAY_MAX_READ_LIMIT = 200;

/** The Relay's own default, made explicit so later pages keep the same floor. */
const RELAY_DEFAULT_HISTORY_WINDOW_SECONDS = 2 * 60 * 60;

/**
 * A read that failed for one channel. Returned, not thrown: Agent Builder hints every thrown 403
 * as bad credentials and every 429 as "do not move on".
 */
type RelayReadOutcome =
  | { ok: false; reason: 'not_readable'; channel: string }
  | { ok: false; reason: 'throttled'; retry_after_seconds?: number };

interface ReadWindow {
  oldest?: string;
  latest?: string;
}

const getRelayErrorDetails = (error: unknown) => {
  const { statusCode, reason, retryAfterSeconds } = (error ?? {}) as {
    statusCode?: unknown;
    reason?: unknown;
    retryAfterSeconds?: unknown;
  };
  return {
    statusCode: typeof statusCode === 'number' ? statusCode : undefined,
    reason: typeof reason === 'string' ? reason : undefined,
    retryAfterSeconds: typeof retryAfterSeconds === 'number' ? retryAfterSeconds : undefined,
  };
};

const toReadOutcome = (error: unknown, channel: string): RelayReadOutcome | undefined => {
  const { statusCode, reason, retryAfterSeconds } = getRelayErrorDetails(error);
  if (statusCode === 403 && reason === 'not_readable') {
    return { ok: false, reason: 'not_readable', channel };
  }
  if (statusCode === 429) {
    return {
      ok: false,
      reason: 'throttled',
      ...(retryAfterSeconds !== undefined ? { retry_after_seconds: retryAfterSeconds } : {}),
    };
  }
  return undefined;
};

const toReadError = (error: unknown): unknown =>
  getRelayErrorDetails(error).statusCode === 400
    ? new Error(
        'The Elastic Slack app rejected the read window. oldest and latest take Slack timestamps, and a window is at most 7 days.'
      )
    : toUserFacingError(error);

/** `oldest:latest`, either side empty when open. */
const encodeReadCursor = ({ oldest, latest }: ReadWindow): string =>
  `${oldest ?? ''}:${latest ?? ''}`;

const decodeReadCursor = (cursor: string): ReadWindow => {
  const bounds = cursor.split(':');
  if (bounds.length !== 2 || bounds.some((bound) => bound && !SLACK_WINDOW_BOUND.test(bound))) {
    throw new Error(
      'Invalid cursor. Pass the nextCursor from the previous response unchanged, or omit it.'
    );
  }
  const [oldest, latest] = bounds;
  return { ...(oldest ? { oldest } : {}), ...(latest ? { latest } : {}) };
};

/**
 * Reads a connected public channel through the Relay, newest first. The Relay has no cursor, so
 * `nextCursor` encodes the next window: the same floor, ending just before the oldest message
 * returned.
 *
 * `inclusive` and `raw` are ignored, and messages carry text only: no blocks, attachments or files.
 */
export async function relayGetConversationHistory(
  connection: SlackRelayConnection,
  ctx: ActionContext,
  input: SlackGetConversationHistoryInput
) {
  if (input.inclusive !== undefined || input.raw) {
    ctx.log.debug(
      'Slack getConversationHistory: inclusive and raw are not supported through the Elastic Slack app and were ignored'
    );
  }

  if ([input.oldest, input.latest].some((bound) => bound && !SLACK_WINDOW_BOUND.test(bound))) {
    throw new Error('oldest and latest take Slack timestamps, e.g. "1700000000.000100".');
  }

  const channelId = input.channel.trim();
  if (!SLACK_CONVERSATION_ID.test(channelId)) {
    throw new Error(
      `"${channelId}" is not a channel ID. Pass the channel ID (C...) from listChannels.`
    );
  }

  const window = input.cursor
    ? decodeReadCursor(input.cursor)
    : {
        oldest:
          input.oldest ??
          String(
            Math.max(
              0,
              Math.floor(Number(input.latest ?? Date.now() / 1000)) -
                RELAY_DEFAULT_HISTORY_WINDOW_SECONDS
            )
          ),
        ...(input.latest ? { latest: input.latest } : {}),
      };

  ctx.log.debug(`Slack getConversationHistory request through relay: channel=${channelId}`);

  try {
    const page = await connection.client.readMessages({
      tenantKey: connection.tenantKey,
      channelId,
      ...window,
      limit: Math.min(input.limit, RELAY_MAX_READ_LIMIT),
    });

    const last = page.messages.at(-1);
    const nextCursor =
      page.truncated && last ? encodeReadCursor({ ...window, latest: last.ts }) : undefined;

    return {
      ok: true as const,
      channel: page.channel.id,
      channelName: page.channel.name,
      messages: page.messages.map(({ ts, threadTs, replyCount, author, text }) => ({
        ts,
        user: author.id,
        username: author.name,
        is_bot: author.isBot,
        text,
        thread_ts: threadTs,
        reply_count: replyCount,
      })),
      nextCursor,
      hasMore: nextCursor !== undefined,
    };
  } catch (error) {
    const outcome = toReadOutcome(error, channelId);
    if (outcome) {
      return outcome;
    }
    ctx.log.error(`Slack getConversationHistory through relay failed: ${(error as Error).message}`);
    throw toReadError(error);
  }
}

/**
 * Replaces `auth.test`, which needs a token this connector does not have. Reading one binding proves
 * the Relay accepts our identity and the workspace is still installed — the two ways this connector
 * breaks without any local change.
 */
export async function relayTest(
  connection: SlackRelayConnection,
  ctx: ActionContext
): Promise<Record<string, never>> {
  ctx.log.debug('Slack test through relay');
  await fetchBindingsPage(connection, ctx, { limit: 1 });
  return {};
}

const assertNotSupported = (ctx: ActionContext, action: string): void => {
  if (!isRelayAuth(ctx)) {
    return;
  }

  throw new Error(
    `${action} is not available through the Elastic Slack app. Supported actions: ${getRelaySupportedActions().join(
      ', '
    )}.`
  );
};

export const slackRelay = {
  getConnection: getRelayConnection,
  assertNotSupported,
  test: relayTest,
  actions: {
    sendMessage: relaySendMessage,
    updateMessage: relayUpdateMessage,
    listChannels: relayListChannels,
    resolveChannelId: relayResolveChannelId,
    getConversationHistory: relayGetConversationHistory,
  },
};
