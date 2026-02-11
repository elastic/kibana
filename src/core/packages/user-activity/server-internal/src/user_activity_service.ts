/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { Logger } from '@kbn/logging';
import type { InternalLoggingServiceSetup } from '@kbn/core-logging-server-internal';
import { map } from 'rxjs';
import { AsyncLocalStorage } from 'async_hooks';
import type { TrackUserActionParams } from '@kbn/core-user-activity-server';
import { config as userActivityConfig, type UserActivityConfigType } from './user_activity_config';
import type {
  InjectedContext,
  InternalUserActivityServiceSetup,
  InternalUserActivityServiceStart,
} from './types';

/** @internal */
interface UserActivitySetupDeps {
  logging: InternalLoggingServiceSetup;
}

/**
 * Service for recording user actions within Kibana.
 *
 * @internal
 */
export class UserActivityService
  implements CoreService<InternalUserActivityServiceSetup, InternalUserActivityServiceStart>
{
  private readonly logger: Logger;
  private enabled = false;
  private readonly injectedContextAsyncStorage: AsyncLocalStorage<InjectedContext>;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('user_activity', 'event');
    this.injectedContextAsyncStorage = new AsyncLocalStorage<InjectedContext>();
  }

  setup({ logging }: UserActivitySetupDeps): InternalUserActivityServiceSetup {
    const config$ = this.coreContext.configService.atPath<UserActivityConfigType>(
      userActivityConfig.path
    );

    config$.subscribe((config) => {
      this.enabled = config.enabled;
    });

    logging.configure(
      ['user_activity'],
      config$.pipe(
        map((config) => ({
          appenders: config.appenders,
          loggers: [
            {
              name: 'event',
              level: 'info',
              appenders: [...config.appenders.keys()],
            },
          ],
        }))
      )
    );

    return {
      trackUserAction: this.trackUserAction,
      setInjectedContext: this.setInjectedContext,
    };
  }

  start() {
    return {
      trackUserAction: this.trackUserAction,
      setInjectedContext: this.setInjectedContext,
    };
  }

  stop() {
    this.enabled = false;
  }

  private trackUserAction = ({ message, event, object }: TrackUserActionParams) => {
    if (!this.enabled) return;

    const injectedContext = this.getInjectedContext();

    if (!message) {
      message = `User ${injectedContext.user?.username} performed ${event.action} on ${object.name} (${object.id})`;
    }

    this.logger.info(message, { message, event, object, ...injectedContext });
  };

  private setInjectedContext = (newContext: InjectedContext) => {
    if (!this.enabled) return;

    const current = this.injectedContextAsyncStorage.getStore() ?? {};

    this.injectedContextAsyncStorage.enterWith({
      client: { ...current.client, ...newContext.client },
      session: { ...current.session, ...newContext.session },
      kibana: {
        space: { ...current.kibana?.space, ...newContext.kibana?.space },
      },
      user: { ...current.user, ...newContext.user },
      http: {
        request: { ...current.http?.request, ...newContext.http?.request },
      },
    });
  };

  private getInjectedContext = () => {
    return this.injectedContextAsyncStorage.getStore() ?? {};
  };
}
