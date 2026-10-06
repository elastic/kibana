/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const DEFAULT_WAIT_FOR_INPUT_TIMEOUT: '72h';
/** Max length for external resume tokens in HITL URLs. */
export declare const MAX_HITL_EXTERNAL_RESUME_TOKEN_LENGTH: 128;
/** Max length for connector saved-object id / name in HITL channel config. */
export declare const MAX_HITL_CHANNEL_CONNECTOR_ID_LENGTH = 512;
/** Max length for a Slack channel id or name in `slack_api` config. */
export declare const MAX_HITL_SLACK_CHANNEL_LENGTH: 256;
/** Max length for HITL step messages and channel notification templates. */
export declare const MAX_HITL_MESSAGE_LENGTH: 10240;
/** Max length for approve/reject button labels. */
export declare const MAX_HITL_ACTION_LABEL_LENGTH: 256;
/** Max length for `respondedBy` on HITL step output. */
export declare const MAX_HITL_RESPONDED_BY_LENGTH: 1024;
/** Max length for `channel` on HITL step output (e.g. inbox, kibana_execution_view, timeout). */
export declare const MAX_HITL_CHANNEL_LENGTH: 256;
/** Max length for `respondedAt` ISO-8601 timestamp on HITL step output. */
export declare const MAX_HITL_RESPONDED_AT_LENGTH: 64;
/** Max length for external resume / form URLs in template context. */
export declare const MAX_HITL_EXTERNAL_LINK_LENGTH: 8192;
/** Max length for workflow graph node ids on HITL step nodes. */
export declare const MAX_HITL_GRAPH_NODE_ID_LENGTH: 255;
/** Max length for keys in dynamic waitForInput response records. */
export declare const MAX_HITL_RESPONSE_FIELD_KEY_LENGTH: 512;
/** Internal `stepExecution.input` field storing the external HITL resume token hash. */
export declare const HITL_TOKEN_HASH_INPUT_FIELD: '_hitlTokenHash';
/** Internal `stepExecution.input` field storing the external HITL resume token expiry. */
export declare const HITL_TOKEN_EXPIRES_AT_INPUT_FIELD: '_hitlTokenExpiresAt';
/** Workflow context path: `context.hitl.externalFormLink`. */
export declare const HITL_EXTERNAL_FORM_LINK_CONTEXT_KEY: 'externalFormLink';
/** Workflow context path: `context.hitl.externalQueryLink`. */
export declare const HITL_EXTERNAL_QUERY_LINK_CONTEXT_KEY: 'externalQueryLink';
export declare const DEFAULT_HITL_INPUT_OPEN_FORM_LABEL: 'Open form';
export declare const DEFAULT_HITL_INPUT_CHANNEL_MESSAGE: 'Respond here: {{context.hitl.externalFormLink}}';
/**
 * YAML schema description for `with.channels` on HITL wait steps with scope boundary definition.
 */
export declare const HITL_EXTERNAL_CHANNELS_DESCRIPTION: 'Optional external notification channels. Sends public short-lived resume links. Do not use for destructive, production-impacting or otherwise hard-to-reverse workflows.';
/** Returns false only when config explicitly sets `enabled: false`. */
export declare const isHitlExternalResumeEnabled: (enabled: boolean | undefined) => boolean;
export type HitlWaitStepType = 'waitForInput' | 'waitForApproval';
export declare const isHitlWaitStepType: (
  stepType: string | undefined
) => stepType is HitlWaitStepType;
/** Maps `with.channels` keys to Kibana connector action types for connector-id autocomplete/validation. */
export declare const HITL_CHANNEL_CONNECTOR_TYPES: {
  readonly slack: 'slack';
  readonly slack_api: 'slack_api';
};
export type HitlChannelKey = keyof typeof HITL_CHANNEL_CONNECTOR_TYPES;
/**
 * Resolves the connector type for a nested HITL `with.channels.<key>.connector-id`
 * path. Shared by YAML validation and editor autocomplete so waitForInput and
 * waitForApproval stay in lockstep.
 */
export declare function getHitlChannelConnectorTypeFromPath(
  path: readonly unknown[] | undefined
): string | null;
