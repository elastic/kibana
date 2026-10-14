/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { Topic } from '@kbn/core-pubsub-server';
import type { InternalPubSubSetup } from './internal_contracts';

type Phase = 'created' | 'setup' | 'started' | 'stopped';

interface RegisteredTopic {
  readonly name: string;
  /** Plugin that registered the topic. Kept for diagnostics; it does not restrict publishing. */
  readonly registeredBy: string;
}

/** @internal */
export class PubSubService implements CoreService<InternalPubSubSetup, void> {
  private readonly logger: Logger;
  private readonly topics = new Map<string, RegisteredTopic>();
  private phase: Phase = 'created';

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('pubsub');
  }

  public setup(): InternalPubSubSetup {
    if (this.phase !== 'created') {
      throw new Error('Pubsub setup can only be called once.');
    }

    this.phase = 'setup';
    this.logger.debug('Pubsub setup complete');

    return {
      registerTopic: (pluginId, topic) => {
        this.registerTopic(pluginId, topic);
      },
    };
  }

  public start(): void {
    if (this.phase !== 'setup') {
      throw new Error('Pubsub cannot start before setup.');
    }

    this.phase = 'started';
  }

  public stop(): void {
    this.phase = 'stopped';
  }

  private registerTopic<TData>(pluginId: string, topic: Topic<TData>): void {
    if (this.phase !== 'setup') {
      throw new Error(`Cannot register topic "${topic.name}" outside of setup.`);
    }

    const existing = this.topics.get(topic.name);
    if (existing) {
      throw new Error(`Topic "${topic.name}" is already registered by "${existing.registeredBy}".`);
    }

    this.topics.set(topic.name, { name: topic.name, registeredBy: pluginId });
  }
}
