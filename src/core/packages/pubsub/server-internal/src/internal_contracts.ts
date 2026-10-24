/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PubSubEventInit,
  PubSubPublishResult,
  PubSubSubscription,
  Topic,
} from '@kbn/core-pubsub-server';

/**
 * Setup contract consumed by the plugin context, which adds the calling plugin id.
 * The plugin id is kept for diagnostics and telemetry. It does not make the plugin the owner of the topic.
 *
 * @internal
 */
export interface InternalPubSubSetup {
  registerTopic<TData>(pluginId: string, topic: Topic<TData>): void;
  /** `subscription.consumer` is plugin-local; the service stores it as `${pluginId}.${consumer}`. */
  subscribe<TData>(
    pluginId: string,
    topic: Topic<TData>,
    subscription: PubSubSubscription<TData>
  ): void;
}

/**
 * Start contract consumed by the plugin context, which adds the calling plugin id.
 *
 * @internal
 */
export interface InternalPubSubStart {
  publish<TData>(
    pluginId: string,
    topic: Topic<TData>,
    event: PubSubEventInit<TData>
  ): Promise<PubSubPublishResult>;
}
