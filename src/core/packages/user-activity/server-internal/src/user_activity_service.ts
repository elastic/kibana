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
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { map } from 'rxjs';
import { AsyncLocalStorage } from 'async_hooks';
import type { TrackUserActionParams, UserActivityEventType } from '@kbn/core-user-activity-server';
import {
  config as userActivityConfig,
  type UserActivityConfigType,
  type UserActivityFiltersType,
} from './user_activity_config';
import type {
  InjectedContext,
  InternalUserActivityServiceSetup,
  InternalUserActivityServiceStart,
} from './types';
import { shouldLog } from './user_activity_filters';

/** @internal */
interface UserActivitySetupDeps {
  logging: InternalLoggingServiceSetup;
}

/** @internal */
interface UserActivityStartDeps {
  typeRegistry: ISavedObjectTypeRegistry;
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
  private filters: UserActivityFiltersType = [];
  private readonly injectedContextAsyncStorage: AsyncLocalStorage<InjectedContext>;
  // set of SO types so we can know when to copy kibana.object to kibana.saved_object
  private savedObjectTypeNames = new Set<string>();

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
      this.filters = config.filters;
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

  start({ typeRegistry }: UserActivityStartDeps): InternalUserActivityServiceStart {
    this.savedObjectTypeNames = new Set(typeRegistry.getAllTypes().map((type) => type.name));

    return {
      trackUserAction: this.trackUserAction,
      setInjectedContext: this.setInjectedContext,
    };
  }

  stop() {
    this.enabled = false;
  }

  private trackUserAction = ({
    message,
    event,
    object,
    metadata,
    error,
  }: TrackUserActionParams) => {
    if (!this.enabled || !shouldLog(event.action, this.filters)) return;

    const injectedContext = this.getInjectedContext();

    if (!message) {
      message = `User ${injectedContext.user?.name} performed ${event.action} on ${object.name} (${object.id})`;
    }

    // ECS `source` is a role-agnostic copy of the role-annotated `client` fields.
    const clientIp = injectedContext.client?.ip;

    const isSavedObject = this.savedObjectTypeNames.has(object.type);

    this.logger.info(message, {
      message,
      event: {
        ...event,
        type: event.type as UserActivityEventType[],
        outcome: event.outcome ?? 'unknown',
      },
      ...(metadata ? { metadata } : {}),
      ...(error ? { error } : {}),
      ...injectedContext,
      kibana: {
        ...injectedContext.kibana,
        object,
        ...(isSavedObject ? { saved_object: { type: object.type, id: object.id } } : {}),
      },
      ...(clientIp ? { source: { address: clientIp, ip: clientIp } } : {}),
    });
  };

  private setInjectedContext = (newContext: InjectedContext) => {
    if (!this.enabled) return;

    const current = this.injectedContextAsyncStorage.getStore() ?? {};

    this.injectedContextAsyncStorage.enterWith({
      client: { ...current.client, ...newContext.client },
      kibana: {
        space: { ...current.kibana?.space, ...newContext.kibana?.space },
        session: { ...current.kibana?.session, ...newContext.kibana?.session },
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
