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
import { OnRequest, CoreSetup } from '../../../../../..';

export const url = {
  root: '/',
  redirect: '/redirect',
  redirectTo: '/redirect-to',
  failed: '/failed',
};

export class DummyOnRequestPlugin {
  public setup(core: CoreSetup) {
    const onRequest: OnRequest = (request, t) => {
      if (request.path === url.redirect) {
        return t.redirected(url.redirectTo);
      }
      if (request.path === url.failed) {
        return t.rejected(new Error('unexpected error'), { statusCode: 400 });
      }

      return t.next();
    };

    core.http.registerOnRequest(onRequest);
    return {};
  }
}
