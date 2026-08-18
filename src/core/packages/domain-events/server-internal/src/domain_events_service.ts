/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type {
  DomainEventsServiceSetup,
  DomainEventsServiceStart,
} from '@kbn/core-domain-events-server';
import { DomainEventBusImpl } from '@kbn/domain-events';
import type { Logger } from '@kbn/logging';

/**
 * In-process domain event bus exposed as a core service. One bus instance per
 * Kibana node, shared between the setup (subscribe) and start (publish) contracts.
 *
 * @internal
 */
export class DomainEventsService
  implements CoreService<DomainEventsServiceSetup, DomainEventsServiceStart>
{
  private readonly logger: Logger;
  private readonly bus = new DomainEventBusImpl();

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('domain-events');
  }

  public setup(): DomainEventsServiceSetup {
    return {
      subscribe: (type, handler) => {
        this.bus.subscribe(type, handler);
      },
      subscribeAll: (handler) => {
        this.bus.subscribeAll(handler);
      },
    };
  }

  public start(): DomainEventsServiceStart {
    return {
      publish: (event) => this.bus.publish(event),
    };
  }

  public stop() {
    this.logger.debug('Stopping domain events service');
  }
}
