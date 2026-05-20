import type { ConnectorSpec } from '../../connector_spec';
/**
 * Slack connector using OAuth2 Authorization Code flow (Slack OAuth v2),
 * with an additional temporary bearer token option for local testing.
 *
 * Required Slack App scopes:
 * MVP:
 * - channels:read - to list channels/conversations (public/private/DMs depending on workspace + membership)
 * - chat:write - for sending messages to public channels
 * - search:read.public (and related granular scopes) - for searching messages (requires a user token)
 * - groups:write - to create private channels and invite users
 *
 * Optional (possible future usage):
 * - groups:read - to list private channels (future)
 * - im:read - to list DMs (future)
 * - mpim:read - to list group DMs (future)
 * - groups:history - to read private channel history (future)
 * - im:history - to read DM history (future)
 * - mpim:history - to read group DM history (future)
 * - users:read,users:read.email - to support user-targeted lookups (not used in MVP)
 */
export declare const Slack: ConnectorSpec;
