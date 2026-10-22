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

/** @internal */
export class PubSubService implements CoreService<InternalPubSubSetup, void> {
  private readonly logger: Logger;
  /** Topic name to the plugin that registered it. Kept for diagnostics; it does not restrict publishing. */
  private readonly topics = new Map<string, string>();
  private phase: Phase = 'created';

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('pubsub');
  }

  public setup(): InternalPubSubSetup {
    if (this.phase !== 'created') {
      throw new Error('Pubsub setup can only be called once.');
    }

    this.phase = 'setup';
    this.logger.debug('Setting up pubsub service');

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

    const registeredBy = this.topics.get(topic.name);
    if (registeredBy) {
      throw new Error(`Topic "${topic.name}" is already registered by "${registeredBy}".`);
    }

    this.topics.set(topic.name, pluginId);
  }
}
