/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import Boom from 'boom';
import { Authenticate, CoreSetup } from '../../../../../../../../core/server';

interface User {
  id: string;
  roles?: string[];
}

interface Storage {
  value: User;
  expires: number;
}

export const url = {
  auth: '/auth',
  authHasSession: '/auth/has_session',
  authClearSession: '/auth/clear_session',
  authRedirect: '/auth/redirect',
};

export const sessionDurationMs = 30;
export class DummySecurityPlugin {
  public setup(core: CoreSetup) {
    const authenticate: Authenticate<Storage> = async (request, sessionStorage, t) => {
      if (request.path === url.authHasSession) {
        const prevSession = await sessionStorage.get();
        if (!prevSession) return t.rejected(new Error('invalid session'), { statusCode: 401 });

        const userData = prevSession.value;
        sessionStorage.set({ value: userData, expires: Date.now() + sessionDurationMs });

        return t.authenticated({ credentials: userData });
      }

      if (request.path === url.authClearSession) {
        sessionStorage.clear();

        return t.rejected(Boom.unauthorized());
      }

      if (request.path === url.authRedirect) {
        return t.redirected('/login');
      }

      if (request.headers.authorization) {
        const user = { id: '42' };
        sessionStorage.set({ value: user, expires: Date.now() + sessionDurationMs });
        return t.authenticated({ credentials: user });
      } else {
        return t.rejected(Boom.unauthorized());
      }
    };

    const cookieOptions = {
      name: 'sid',
      password: 'something_at_least_32_characters',
      validate: (session: Storage) => session.expires > Date.now(),
      isSecure: false,
      path: '/',
    };
    core.http.registerAuth(authenticate, cookieOptions);
    return {
      dummy() {
        return 'Hello from dummy plugin';
      },
    };
  }
}
