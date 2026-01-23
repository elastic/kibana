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
import { config as userActivityConfig, type UserActivityConfigType } from './user_activity_config';

/** @internal */
interface UserActivitySetupDeps {
  logging: InternalLoggingServiceSetup;
}

export interface UserActivityObjectDescriptor {
  id: string;
  name: string;
  type: string;
  tags: string[];
}

export interface UserActivityEventDescriptor {
  action: string;
  type: string;
}

export interface TrackUserActionParams {
  message?: string;
  event: UserActivityEventDescriptor;
  object: UserActivityObjectDescriptor;
}

export interface InternalUserActivityServiceSetup {
  trackUserAction(params: TrackUserActionParams): void;
}

export interface InternalUserActivityServiceStart {
  trackUserAction(params: TrackUserActionParams): void;
}

export class UserActivityService
  implements CoreService<InternalUserActivityServiceSetup, InternalUserActivityServiceStart>
{
  private readonly logger: Logger;
  private enabled = false;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('user_activity', 'event');
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
    };
  }

  start() {
    return {
      trackUserAction: this.trackUserAction,
    };
  }

  stop() {
    this.enabled = false;
  }

  private trackUserAction = ({ message, event, object }: TrackUserActionParams): void => {
    if (!this.enabled) return;

    if (!message) {
      // TODO: update this when we can
      message = `fill this with the values we are yet to obtain`;
    }

    this.logger.info(message, { message, event, object });
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
