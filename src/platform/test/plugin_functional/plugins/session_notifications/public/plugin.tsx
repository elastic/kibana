/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import type { AppPluginDependenciesStart, SessionNotificationsGlobalApi } from './types';

export class SessionNotificationsPlugin implements Plugin {
  private sessionIds: Array<string | undefined> = [];

  public setup() {
    const windowWithGlobalApi = window as {
      __SESSION_NOTIFICATIONS_PLUGIN__?: SessionNotificationsGlobalApi;
    };

    windowWithGlobalApi.__SESSION_NOTIFICATIONS_PLUGIN__ = {
      getSessionIds: () => this.sessionIds,
      clearSessionIds: () => {
        this.sessionIds.length = 0;
      },
    };
  }

  public start(core: CoreStart, { data }: AppPluginDependenciesStart) {
    core.application.currentAppId$.subscribe(() => {
      this.sessionIds.length = 0;
    });

    data.search.session.getSession$().subscribe((sessionId?: string) => {
      this.sessionIds.push(sessionId);
    });
  }

  public stop() {}
}
