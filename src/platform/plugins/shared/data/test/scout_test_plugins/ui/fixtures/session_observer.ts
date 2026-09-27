/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

interface SessionObserverWindow extends Window {
  __SESSION_NOTIFICATIONS_PLUGIN__?: {
    getSessionIds: () => Array<string | undefined>;
    clearSessionIds: () => void;
  };
}

export class SessionObserver {
  constructor(private readonly page: ScoutPage) {}

  async isAvailable(): Promise<boolean> {
    return this.page.evaluate(() =>
      Boolean((window as SessionObserverWindow).__SESSION_NOTIFICATIONS_PLUGIN__)
    );
  }

  async getSessionIds(): Promise<string[]> {
    return this.page.evaluate(() => {
      const observer = (window as SessionObserverWindow).__SESSION_NOTIFICATIONS_PLUGIN__;
      if (!observer) {
        throw new Error('The session_notifications fixture plugin must be loaded on the server');
      }
      return observer
        .getSessionIds()
        .filter((sessionId): sessionId is string => sessionId !== undefined);
    });
  }

  async clear(): Promise<void> {
    await this.page.evaluate(() => {
      const observer = (window as SessionObserverWindow).__SESSION_NOTIFICATIONS_PLUGIN__;
      if (!observer) {
        throw new Error('The session_notifications fixture plugin must be loaded on the server');
      }
      observer.clearSessionIds();
    });
  }
}
