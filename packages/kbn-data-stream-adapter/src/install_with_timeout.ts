/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, type Observable } from 'rxjs';

const INSTALLATION_TIMEOUT = 20 * 60 * 1000; // 20 minutes

interface InstallWithTimeoutOpts {
  description?: string;
  installFn: () => Promise<void>;
  pluginStop$: Observable<void>;
  timeoutMs?: number;
}

export class InstallShutdownError extends Error {
  constructor() {
    super('Server is stopping; must stop all async operations');
    Object.setPrototypeOf(this, InstallShutdownError.prototype);
  }
}

export const installWithTimeout = async ({
  description,
  installFn,
  pluginStop$,
  timeoutMs = INSTALLATION_TIMEOUT,
}: InstallWithTimeoutOpts): Promise<void> => {
  try {
    let timeoutId: NodeJS.Timeout;
    const install = async (): Promise<void> => {
      await installFn();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    const throwTimeoutException = (): Promise<void> => {
      return new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const msg = `Timeout: it took more than ${timeoutMs}ms`;
          reject(new Error(msg));
        }, timeoutMs);

        firstValueFrom(pluginStop$).then(() => {
          clearTimeout(timeoutId);
          reject(new InstallShutdownError());
        });
      });
    };

    await Promise.race([install(), throwTimeoutException()]);
  } catch (e) {
    if (e instanceof InstallShutdownError) {
      throw e;
    } else {
      const reason = e?.message || 'Unknown reason';
      throw new Error(
        `Failure during installation${description ? ` of ${description}` : ''}. ${reason}`
      );
    }
  }
};
