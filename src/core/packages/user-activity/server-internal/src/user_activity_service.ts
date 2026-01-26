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
import { type InternalLoggingServiceSetup } from '@kbn/core-logging-server-internal';
import { map } from 'rxjs';
import type { ConsoleAppenderConfig, FileAppenderConfig } from '@kbn/core-logging-server';
import { AsyncLocalStorage } from 'async_hooks';
import { config as userActivityConfig, type UserActivityConfigType } from './user_activity_config';

interface UserActivitySetupDeps {
  logging: InternalLoggingServiceSetup;
}

interface EventParams {
  id: string;
  name: string;
  type: string;
  tags: string[];
}

interface ObjectParams {
  action: string;
  type: string;
}

export interface TrackUserActionParams {
  message?: string;
  event: EventParams;
  object: ObjectParams;
}

interface SessionContext {
  id?: string;
}

interface SpaceContext {
  id?: string;
}

interface UserContext {
  id?: string;
  username?: string;
  email?: string;
  roles?: string[];
  ip?: string;
}

interface InjectedContext {
  session?: SessionContext;
  kibana?: {
    space?: SpaceContext;
  };
  user?: UserContext;
}

export interface InternalUserActivityServiceSetup {
  trackUserAction(params: TrackUserActionParams): void;
  setInjectedContext(newContext: InjectedContext): void;
}

export interface InternalUserActivityServiceStart {
  trackUserAction(params: TrackUserActionParams): void;
  setInjectedContext(newContext: InjectedContext): void;
}

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
        map((config) => {
          const userActivityJsonFileAppender = getuserActivityAppender(config.file);

          return {
            appenders: {
              user_activity_json_file: userActivityJsonFileAppender,
            },
            loggers: [
              {
                name: 'event',
                level: 'info',
                appenders: ['user_activity_json_file'],
              },
            ],
          };
        })
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

    if (!message) {
      // TODO: update this when we can
      message = `fill this with the values we are yet to obtain`;
    }

    const injectedContext = this.getInjectedContext();

    this.logger.info(message, { message, event, object, ...injectedContext });
  };

  private setInjectedContext = (newContext: InjectedContext) => {
    if (!this.enabled) return;

    const current = this.injectedContextAsyncStorage.getStore() ?? {};

    this.injectedContextAsyncStorage.enterWith({
      session: { ...current.session, ...newContext.session },
      kibana: {
        space: { ...current.kibana?.space, ...newContext.kibana?.space },
      },
      user: { ...current.user, ...newContext.user },
    });
  };

  private getInjectedContext = () => {
    return this.injectedContextAsyncStorage.getStore() ?? {};
  };
}

function getuserActivityAppender(
  fileName: string | undefined
): ConsoleAppenderConfig | FileAppenderConfig {
  if (fileName) {
    return {
      type: 'file',
      layout: { type: 'json' },
      fileName,
    };
  }

  // TODO: figure out what to do with the default, is it console or some file that we decide?
  return {
    type: 'console',
    layout: { type: 'json' },
  };
}
