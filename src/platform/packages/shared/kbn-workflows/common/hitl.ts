/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DEFAULT_WAIT_FOR_INPUT_TIMEOUT = '72h' as const;

/** Max length for external resume tokens in HITL URLs. */
export const MAX_HITL_EXTERNAL_RESUME_TOKEN_LENGTH = 128 as const;

/** Max length for connector saved-object id / name in HITL channel config. */
export const MAX_HITL_CHANNEL_CONNECTOR_ID_LENGTH = 512 as const;

/** Max length for Slack channel id in `slack_api` config. */
export const MAX_HITL_SLACK_CHANNEL_ID_LENGTH = 256 as const;

/** Max length for HITL step messages and channel notification templates. */
export const MAX_HITL_MESSAGE_LENGTH = 10_240 as const;

/** Max length for approve/reject button labels. */
export const MAX_HITL_ACTION_LABEL_LENGTH = 256 as const;

/** Max length for `respondedBy` on HITL step output. */
export const MAX_HITL_RESPONDED_BY_LENGTH = 1024 as const;

/** Max length for external resume / form URLs in template context. */
export const MAX_HITL_EXTERNAL_LINK_LENGTH = 8192 as const;

/** Max length for workflow graph node ids on HITL step nodes. */
export const MAX_HITL_GRAPH_NODE_ID_LENGTH = 255 as const;

/** Max length for keys in dynamic waitForInput response records. */
export const MAX_HITL_RESPONSE_FIELD_KEY_LENGTH = 512 as const;

/** Internal `stepExecution.input` field storing the external HITL resume token hash. */
export const HITL_TOKEN_HASH_INPUT_FIELD = '_hitlTokenHash' as const;

/** Internal `stepExecution.input` field storing the external HITL resume token expiry. */
export const HITL_TOKEN_EXPIRES_AT_INPUT_FIELD = '_hitlTokenExpiresAt' as const;

/** Workflow context path: `context.hitl.externalFormLink`. */
export const HITL_EXTERNAL_FORM_LINK_CONTEXT_KEY = 'externalFormLink' as const;

/** Workflow context path: `context.hitl.externalQueryLink`. */
export const HITL_EXTERNAL_QUERY_LINK_CONTEXT_KEY = 'externalQueryLink' as const;

export const DEFAULT_HITL_INPUT_OPEN_FORM_LABEL = 'Open form' as const;

export const DEFAULT_HITL_INPUT_CHANNEL_MESSAGE =
  'Respond here: {{context.hitl.externalFormLink}}' as const;

/**
 * YAML schema description for `with.channels` on HITL wait steps with scope boundary definition.
 */
export const HITL_EXTERNAL_CHANNELS_DESCRIPTION =
  'Optional external notification channels. Sends public short-lived resume links. Do not use for destructive, production-impacting or otherwise hard-to-reverse workflows.' as const;

/** Returns false only when config explicitly sets `enabled: false`. */
export const isHitlExternalResumeEnabled = (enabled: boolean | undefined): boolean =>
  enabled !== false;
